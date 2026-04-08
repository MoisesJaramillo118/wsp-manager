import json
import re
import requests
from django.conf import settings


class EvolutionAPIError(Exception):
    def __init__(self, message, status_code=500):
        super().__init__(message)
        self.status_code = status_code


def _clean_phone(phone):
    return re.sub(r'[\s+\-()]', '', phone)


def api_call(method, endpoint, body=None):
    url = f'{settings.EVOLUTION_API_URL}{endpoint}'
    headers = {
        'Content-Type': 'application/json',
        'apikey': settings.EVOLUTION_API_KEY,
    }
    response = requests.request(method, url, headers=headers, json=body, timeout=30)
    try:
        data = response.json()
    except (ValueError, requests.exceptions.JSONDecodeError):
        data = {}

    if not response.ok:
        msg_field = None
        if isinstance(data, dict):
            resp = data.get('response', {})
            if isinstance(resp, dict):
                msg_field = resp.get('message')
            if msg_field is None:
                msg_field = data.get('message')

        if isinstance(msg_field, list):
            first = msg_field[0] if msg_field else {}
            if isinstance(first, dict) and first.get('exists') is False:
                err_msg = f"El numero {first.get('number', '')} no esta registrado en WhatsApp"
            else:
                err_msg = json.dumps(msg_field)
        elif isinstance(msg_field, str):
            err_msg = msg_field
        else:
            err_msg = data.get('message', json.dumps(data)) if isinstance(data, dict) else json.dumps(data)

        raise EvolutionAPIError(err_msg, status_code=response.status_code)

    return data


def create_instance(webhook_url=None):
    payload = {
        'instanceName': settings.INSTANCE_NAME,
        'integration': 'WHATSAPP-BAILEYS',
        'qrcode': True,
        'rejectCall': False,
        'groupsIgnore': True,
        'alwaysOnline': False,
        'readMessages': False,
        'readStatus': False,
        'syncFullHistory': False,
    }
    if webhook_url:
        payload['webhook'] = {
            'url': webhook_url,
            'byEvents': False,
            'base64': False,
            'events': ['MESSAGES_UPSERT'],
        }
    return api_call('POST', '/instance/create', payload)


def create_instance_with_code(phone_number, webhook_url=None):
    clean_phone = _clean_phone(phone_number)
    payload = {
        'instanceName': settings.INSTANCE_NAME,
        'integration': 'WHATSAPP-BAILEYS',
        'number': clean_phone,
        'qrcode': False,
        'rejectCall': False,
        'groupsIgnore': True,
        'alwaysOnline': False,
        'readMessages': False,
        'readStatus': False,
        'syncFullHistory': False,
    }
    if webhook_url:
        payload['webhook'] = {
            'url': webhook_url,
            'byEvents': False,
            'base64': False,
            'events': ['MESSAGES_UPSERT'],
        }
    return api_call('POST', '/instance/create', payload)


def set_webhook(webhook_url):
    return api_call('POST', f'/webhook/set/{settings.INSTANCE_NAME}', {
        'webhook': {
            'enabled': True,
            'url': webhook_url,
            'webhookByEvents': False,
            'webhookBase64': False,
            'events': ['MESSAGES_UPSERT'],
        }
    })


def get_connection_state():
    return api_call('GET', f'/instance/connectionState/{settings.INSTANCE_NAME}')


def get_qr_code():
    return api_call('GET', f'/instance/connect/{settings.INSTANCE_NAME}')


def fetch_instances():
    return api_call('GET', '/instance/fetchInstances')


def logout():
    return api_call('DELETE', f'/instance/logout/{settings.INSTANCE_NAME}')


def delete_instance():
    return api_call('DELETE', f'/instance/delete/{settings.INSTANCE_NAME}')


def restart_instance():
    return api_call('PUT', f'/instance/restart/{settings.INSTANCE_NAME}')


def send_text(phone, text):
    clean_phone = _clean_phone(phone)
    return api_call('POST', f'/message/sendText/{settings.INSTANCE_NAME}', {
        'number': clean_phone,
        'text': text,
    })


def send_media(phone, media_url, caption='', mediatype='image'):
    clean_phone = _clean_phone(phone)
    return api_call('POST', f'/message/sendMedia/{settings.INSTANCE_NAME}', {
        'number': clean_phone,
        'mediatype': mediatype,
        'media': media_url,
        'caption': caption,
        'fileName': caption or 'archivo',
    })


def send_document(phone, file_url, file_name):
    clean_phone = _clean_phone(phone)
    return api_call('POST', f'/message/sendMedia/{settings.INSTANCE_NAME}', {
        'number': clean_phone,
        'mediatype': 'document',
        'media': file_url,
        'fileName': file_name,
    })


def is_on_whatsapp(phone):
    clean_phone = _clean_phone(phone)
    return api_call('POST', f'/chat/whatsappNumbers/{settings.INSTANCE_NAME}', {
        'numbers': [clean_phone],
    })
