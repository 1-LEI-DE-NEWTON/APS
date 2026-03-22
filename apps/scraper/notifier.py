import os
from time import sleep

import requests
from dotenv import load_dotenv

load_dotenv()

WHATSAPP_NUMBER = os.getenv('WHATSAPP_NUMBER')
EVOLUTION_API_KEY = os.getenv('EVOLUTION_API_KEY')
EVOLUTION_SERVER_HOST = os.getenv('EVOLUTION_SERVER_HOST')
EVOLUTION_INSTANCE_NAME = os.getenv('EVOLUTION_INSTANCE_NAME')


def notificar_edital(edital, tipo='novo'):
    if tipo == 'novo':
        mensagem = (
            f"🆕 *Novo edital encontrado:*\n\n"
            f" 🏢 Orgão: {edital['orgao']} \n\n"
            f"📝 *Título:* {edital['titulo']}\n\n"
            f"📄 *Descrição:* {edital['descricao']}\n\n"
            f"📅 *Data de Início:* {edital['data_inicio']}\n"
            f"📅 *Data de Fim:* {edital['data_fim']}\n\n"
            f"🔗 *URL:* {edital['url']}"
        )
    else:
        mensagem = (
            f"⚠️ *Prazo próximo para o edital:*\n\n"
            f" 🏢 Orgão: {edital['orgao']} \n\n"
            f"📝 *Título:* {edital['titulo']}\n\n"
            f"📄 *Descrição:* {edital['descricao']}\n\n"
            f"📅 *Data de Início:* {edital['data_inicio']}\n"
            f"📅 *Data de Fim:* {edital['data_fim']}\n\n"
            f"🔗 *URL:* {edital['url']}"
        )

    return enviar_whatsapp(mensagem)


def enviar_whatsapp(mensagem):
    if not all([WHATSAPP_NUMBER, EVOLUTION_API_KEY, EVOLUTION_SERVER_HOST, EVOLUTION_INSTANCE_NAME]):
        print('❌ Erro: Configuração da Evolution API incompleta')
        print('Verifique as variáveis: WHATSAPP_NUMBER, EVOLUTION_API_KEY, EVOLUTION_SERVER_HOST, EVOLUTION_INSTANCE_NAME')
        return False

    try:
        json_payload = {
            'number': WHATSAPP_NUMBER,
            'options': {
                'delay': 1200,
                'presence': 'composing',
                'linkPreview': True,
            },
            'textMessage': {
                'text': mensagem,
            },
        }

        url = f'{EVOLUTION_SERVER_HOST}/message/sendText/{EVOLUTION_INSTANCE_NAME}'

        headers = {
            'Content-Type': 'application/json',
            'apiKey': EVOLUTION_API_KEY,
        }

        print('📱 Enviando notificação para o WhatsApp...')

        sleep(2)
        response = requests.post(url, json=json_payload, headers=headers, timeout=30)

        if response.status_code in (200, 201):
            print('✅ Notificação enviada com sucesso!')
            return True

        print(f'❌ Erro ao enviar notificação: {response.status_code}')
        print(f'Resposta: {response.text}')
        return False

    except requests.exceptions.RequestException as e:
        print(f'❌ Erro de conexão ao enviar notificação: {e}')
        return False
    except Exception as e:
        print(f'❌ Erro inesperado ao enviar notificação: {e}')
        return False
