import os
from datetime import datetime, timedelta

import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

DB_NAME = os.getenv('DB_NAME')
DB_USER = os.getenv('DB_USER')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_HOST = os.getenv('DB_HOST')
DB_PORT = os.getenv('DB_PORT')


def conectar():
    return psycopg2.connect(
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        port=DB_PORT,
    )


def criar_tabela():
    conn = conectar()
    cur = conn.cursor()
    cur.execute(
        '''
        CREATE TABLE IF NOT EXISTS editais (
            id SERIAL PRIMARY KEY,
            titulo TEXT,
            orgao TEXT,
            descricao TEXT,
            resumo_ia TEXT,
            tags_ia TEXT[],
            url TEXT UNIQUE,
            data_inicio DATE,
            data_fim DATE,
            notificado_novo BOOLEAN DEFAULT FALSE,
            notificado_prazo BOOLEAN DEFAULT FALSE,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        '''
    )
    cur.execute('ALTER TABLE editais ADD COLUMN IF NOT EXISTS resumo_ia TEXT;')
    cur.execute('ALTER TABLE editais ADD COLUMN IF NOT EXISTS tags_ia TEXT[];')
    cur.execute(
        '''
        CREATE TABLE IF NOT EXISTS coletas (
            id SERIAL PRIMARY KEY,
            started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            finished_at TIMESTAMP,
            status TEXT NOT NULL,
            inserted_count INTEGER NOT NULL DEFAULT 0,
            notified_new_count INTEGER NOT NULL DEFAULT 0,
            notified_deadline_count INTEGER NOT NULL DEFAULT 0,
            error_message TEXT
        );
        '''
    )
    conn.commit()
    cur.close()
    conn.close()


def iniciar_coleta():
    conn = conectar()
    cur = conn.cursor()
    cur.execute(
        '''
        INSERT INTO coletas (status)
        VALUES ('running')
        RETURNING id;
        '''
    )
    coleta_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    return coleta_id


def finalizar_coleta(
    coleta_id,
    status,
    inserted_count=0,
    notified_new_count=0,
    notified_deadline_count=0,
    error_message=None,
):
    conn = conectar()
    cur = conn.cursor()
    cur.execute(
        '''
        UPDATE coletas
        SET finished_at = CURRENT_TIMESTAMP,
            status = %s,
            inserted_count = %s,
            notified_new_count = %s,
            notified_deadline_count = %s,
            error_message = %s
        WHERE id = %s;
        ''',
        (
            status,
            inserted_count,
            notified_new_count,
            notified_deadline_count,
            error_message,
            coleta_id,
        ),
    )
    conn.commit()
    cur.close()
    conn.close()


def obter_ultima_coleta():
    conn = conectar()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute(
        '''
        SELECT *
        FROM coletas
        ORDER BY id DESC
        LIMIT 1;
        '''
    )
    coleta = cur.fetchone()
    cur.close()
    conn.close()
    return coleta


def edital_ja_existe(edital):
    conn = conectar()
    cur = conn.cursor()
    cur.execute('SELECT 1 FROM editais WHERE url = %s;', (edital['url'],))
    existe = cur.fetchone() is not None
    cur.close()
    conn.close()
    return existe


def salvar_edital(edital):
    conn = conectar()
    cur = conn.cursor()
    tags_ia = edital.get('tags_ia') or None
    cur.execute(
        '''
        INSERT INTO editais (titulo, orgao, descricao, resumo_ia, tags_ia, url, data_inicio, data_fim)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (url) DO NOTHING;
        ''',
        (
            edital['titulo'],
            edital['orgao'],
            edital['descricao'],
            edital.get('resumo_ia'),
            tags_ia,
            edital['url'],
            _converter_data(edital['data_inicio']),
            _converter_data(edital['data_fim']),
        ),
    )
    conn.commit()
    inserted = cur.rowcount > 0
    cur.close()
    conn.close()
    return inserted


def marcar_notificado(url, tipo='novo'):
    conn = conectar()
    cur = conn.cursor()
    if tipo == 'novo':
        cur.execute('UPDATE editais SET notificado_novo = TRUE WHERE url = %s;', (url,))
    elif tipo == 'prazo':
        cur.execute('UPDATE editais SET notificado_prazo = TRUE WHERE url = %s;', (url,))
    conn.commit()
    cur.close()
    conn.close()


def get_editais_com_prazo_curto(dias=5):
    conn = conectar()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    hoje = datetime.today().date()
    limite = hoje + timedelta(days=dias)
    cur.execute(
        '''
        SELECT *
        FROM editais
        WHERE data_fim IS NOT NULL
          AND data_fim >= %s
          AND data_fim <= %s
          AND NOT notificado_prazo;
        ''',
        (hoje, limite),
    )
    resultados = cur.fetchall()
    cur.close()
    conn.close()
    return resultados


def listar_editais(orgao=None, q=None, status=None, limit=50, offset=0):
    where_parts = []
    values = []

    if orgao:
        where_parts.append('orgao ILIKE %s')
        values.append(f'%{orgao}%')

    if q:
        where_parts.append('(titulo ILIKE %s OR descricao ILIKE %s OR COALESCE(resumo_ia, \'\') ILIKE %s)')
        values.append(f'%{q}%')
        values.append(f'%{q}%')
        values.append(f'%{q}%')

    if status == 'abertos':
        where_parts.append('(data_fim IS NULL OR data_fim >= CURRENT_DATE)')
    elif status == 'encerrados':
        where_parts.append('data_fim IS NOT NULL AND data_fim < CURRENT_DATE')

    where_sql = ''
    if where_parts:
        where_sql = 'WHERE ' + ' AND '.join(where_parts)

    conn = conectar()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    cur.execute(f'SELECT COUNT(*) AS total FROM editais {where_sql};', values)
    total = cur.fetchone()['total']

    cur.execute(
        f'''
        SELECT *
        FROM editais
        {where_sql}
        ORDER BY criado_em DESC, id DESC
        LIMIT %s OFFSET %s;
        ''',
        values + [limit, offset],
    )
    items = cur.fetchall()

    cur.close()
    conn.close()

    return {
        'items': items,
        'total': total,
        'limit': limit,
        'offset': offset,
    }


def get_edital_por_id(edital_id):
    conn = conectar()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute('SELECT * FROM editais WHERE id = %s;', (edital_id,))
    edital = cur.fetchone()
    cur.close()
    conn.close()
    return edital


def _converter_data(data_str):
    if data_str is None:
        return None
    try:
        return datetime.strptime(data_str, '%d/%m/%Y').date()
    except Exception:
        return None
