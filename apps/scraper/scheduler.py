from apscheduler.schedulers.blocking import BlockingScheduler
from main import verificar_novos_editais, verificar_prazos

scheduler = BlockingScheduler()

@scheduler.scheduled_job('interval', hours=6)
def tarefa_periodica():    
    verificar_novos_editais()
    verificar_prazos()

if __name__ == '__main__':
    scheduler.start()
