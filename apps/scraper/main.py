from apscheduler.schedulers.blocking import BlockingScheduler

from db import (
    criar_tabela,
    edital_ja_existe,
    finalizar_coleta,
    get_editais_com_prazo_curto,
    iniciar_coleta,
    marcar_notificado,
    salvar_edital,
)
from notifier import notificar_edital
from scraper import buscar_editais

scheduler = BlockingScheduler()


def verificar_novos_editais():
    editais = buscar_editais()
    inserted_count = 0
    notified_new_count = 0

    for edital in editais:
        if edital_ja_existe(edital):
            continue

        inserted = salvar_edital(edital)
        if inserted:
            inserted_count += 1

        if notificar_edital(edital):
            marcar_notificado(edital['url'], tipo='novo')
            notified_new_count += 1

    return inserted_count, notified_new_count


def verificar_prazos():
    editais = get_editais_com_prazo_curto()
    notified_deadline_count = 0

    for edital in editais:
        if notificar_edital(edital, tipo='prazo'):
            marcar_notificado(edital['url'], tipo='prazo')
            notified_deadline_count += 1

    return notified_deadline_count


def executar_ciclo_coleta():
    coleta_id = iniciar_coleta()

    try:
        inserted_count, notified_new_count = verificar_novos_editais()
        notified_deadline_count = verificar_prazos()
        finalizar_coleta(
            coleta_id,
            status='success',
            inserted_count=inserted_count,
            notified_new_count=notified_new_count,
            notified_deadline_count=notified_deadline_count,
        )
        return {
            'coleta_id': coleta_id,
            'status': 'success',
            'inserted_count': inserted_count,
            'notified_new_count': notified_new_count,
            'notified_deadline_count': notified_deadline_count,
        }
    except Exception as exc:
        finalizar_coleta(coleta_id, status='failed', error_message=str(exc))
        raise


def startup():
    criar_tabela()
    return executar_ciclo_coleta()


@scheduler.scheduled_job('interval', hours=24)
def tarefa_agendada():
    executar_ciclo_coleta()


if __name__ == '__main__':
    startup()
    scheduler.start()
