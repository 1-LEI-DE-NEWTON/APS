import os
from datetime import date, datetime
from threading import Lock
from typing import Any

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI, HTTPException, Query

from db import criar_tabela, get_edital_por_id, listar_editais, obter_ultima_coleta
from main import executar_ciclo_coleta

app = FastAPI(title='Edital Scraper Service', version='1.0.0')

scheduler = BackgroundScheduler()
run_lock = Lock()


def serialize_value(value: Any):
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


def serialize_row(row: dict[str, Any] | None):
    if row is None:
        return None
    return {key: serialize_value(value) for key, value in row.items()}


def run_collection_job():
    if not run_lock.acquire(blocking=False):
        return
    try:
        executar_ciclo_coleta()
    finally:
        run_lock.release()


@app.on_event('startup')
def on_startup():
    criar_tabela()

    run_on_startup = os.getenv('SCRAPER_RUN_STARTUP', 'true').lower() == 'true'
    if run_on_startup:
        run_collection_job()

    interval_hours = int(os.getenv('SCRAPER_INTERVAL_HOURS', '24'))
    scheduler.add_job(run_collection_job, 'interval', hours=interval_hours, id='scheduled-collection', replace_existing=True)
    scheduler.start()


@app.on_event('shutdown')
def on_shutdown():
    if scheduler.running:
        scheduler.shutdown(wait=False)


@app.get('/health')
def health():
    return {'status': 'ok'}


@app.get('/editais')
def list_editais(
    orgao: str | None = Query(default=None),
    q: str | None = Query(default=None),
    status: str | None = Query(default=None, pattern='^(abertos|encerrados)$'),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    result = listar_editais(orgao=orgao, q=q, status=status, limit=limit, offset=offset)
    result['items'] = [serialize_row(item) for item in result['items']]
    return result


@app.get('/editais/{edital_id}')
def get_edital(edital_id: int):
    edital = get_edital_por_id(edital_id)
    if not edital:
        raise HTTPException(status_code=404, detail='Edital não encontrado')
    return serialize_row(edital)


@app.post('/coletas/executar')
def run_collection_now():
    if not run_lock.acquire(blocking=False):
        raise HTTPException(status_code=409, detail='Já existe uma coleta em execução')

    try:
        result = executar_ciclo_coleta()
        latest = obter_ultima_coleta()
        payload = serialize_row(latest) if latest else result
        return payload
    finally:
        run_lock.release()


@app.get('/coletas/status/latest')
def get_latest_collection_status():
    latest = obter_ultima_coleta()
    return serialize_row(latest)
