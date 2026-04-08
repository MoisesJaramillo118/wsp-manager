import json
import logging
import requests

from .models import AISettings

logger = logging.getLogger(__name__)

PROVIDERS = {
    'openai': {
        'url': 'https://api.openai.com/v1/chat/completions',
        'default_model': 'gpt-4o-mini',
    },
    'groq': {
        'url': 'https://api.groq.com/openai/v1/chat/completions',
        'default_model': 'llama-3.3-70b-versatile',
    },
    'gemini': {
        'url': 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
        'default_model': 'gemini-2.0-flash',
    },
}


def get_settings():
    try:
        return AISettings.objects.get(id=1)
    except AISettings.DoesNotExist:
        return None


def generate_response(message, contact_name, history=None, extra_context=''):
    if history is None:
        history = []

    settings = get_settings()
    if not settings or not settings.enabled or not settings.api_key:
        return None

    provider = PROVIDERS.get(settings.provider)
    if not provider:
        return None

    # Build messages array with conversation context
    system_prompt = settings.system_prompt + (extra_context or '')
    messages = [
        {'role': 'system', 'content': system_prompt}
    ]

    # Add last 6 messages of conversation for context
    for msg in history[-6:]:
        role = 'user' if msg.get('direction') == 'incoming' else 'assistant'
        messages.append({'role': role, 'content': msg.get('message', '')})

    # Add current message
    if contact_name:
        messages.append({'role': 'user', 'content': f'[Cliente: {contact_name}] {message}'})
    else:
        messages.append({'role': 'user', 'content': message})

    try:
        headers = {'Content-Type': 'application/json'}

        if settings.provider == 'gemini':
            headers['x-goog-api-key'] = settings.api_key
        else:
            headers['Authorization'] = f'Bearer {settings.api_key}'

        payload = {
            'model': settings.model or provider['default_model'],
            'messages': messages,
            'max_tokens': settings.max_tokens or 300,
            'temperature': 0.7,
        }

        res = requests.post(provider['url'], headers=headers, json=payload, timeout=30)
        data = res.json()

        if not res.ok:
            error_msg = data.get('error', {}).get('message', json.dumps(data))
            logger.error('[AI] Error: %s', error_msg)
            return None

        reply = data.get('choices', [{}])[0].get('message', {}).get('content', '')
        return reply.strip() or None

    except Exception as err:
        logger.error('[AI] Error: %s', str(err))
        return None
