import json
import logging
import re
import requests

from .models import AISettings
from core.secrets import decrypt_value, encrypt_value, has_master_key

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


def sanitize_api_key(provider_name, raw_key):
    if not raw_key:
        return ''

    value = str(raw_key).strip()
    tokens = re.split(r'[\s"\']+', value)

    if provider_name == 'openai':
        for token in tokens:
            if token.startswith('sk-'):
                return token.strip()
    elif provider_name == 'groq':
        for token in tokens:
            if token.startswith('gsk_'):
                return token.strip()
    elif provider_name == 'gemini':
        for token in tokens:
            if token.startswith('AIza'):
                return token.strip()

    return value


def get_settings():
    try:
        settings = AISettings.objects.get(id=1)
        if settings.api_key and not settings.api_key.startswith('enc:') and has_master_key():
            encrypted = encrypt_value(settings.api_key)
            if encrypted != settings.api_key:
                AISettings.objects.filter(id=settings.id).update(api_key=encrypted)
                settings.api_key = encrypted
        return settings
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

        api_key = sanitize_api_key(settings.provider, decrypt_value(settings.api_key))
        if not api_key:
            logger.error('[AI] API key vacia o invalida para provider=%s', settings.provider)
            return None

        if settings.provider == 'gemini':
            headers['x-goog-api-key'] = api_key
        else:
            headers['Authorization'] = f'Bearer {api_key}'

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


def suggest_meta_template(idea):
    """Generate 3-5 Meta WhatsApp Business compatible template suggestions."""
    settings = get_settings()
    if not settings or not settings.enabled or not settings.api_key:
        return None

    provider_config = PROVIDERS.get(settings.provider)
    if not provider_config:
        return None

    system_prompt = """Eres un experto en WhatsApp Business API y plantillas de Meta. Tu trabajo es generar plantillas de mensajes que CUMPLAN ESTRICTAMENTE las reglas de aprobacion de Meta.

REGLAS DE META PARA APROBACION:
1. Categoria correcta: MARKETING (promociones, novedades), UTILITY (notificaciones, recordatorios), AUTHENTICATION (codigos OTP)
2. Tono profesional pero amigable
3. NO usar mayusculas excesivas (NO escribir TODO EN MAYUSCULAS)
4. NO usar emojis excesivos (maximo 1-2 si es necesario)
5. NO promesas falsas ("100% garantizado", "GRATIS", "URGENTE!!!")
6. NO links sospechosos o acortados (evitar bit.ly, tinyurl)
7. Maximo 1024 caracteres
8. NO usar variables de nombre personal ({{nombre}}) - las plantillas deben ser impersonales
9. Variables permitidas: {{1}}, {{2}}, etc. para datos dinamicos como fecha, monto, codigo
10. Lenguaje claro y directo, sin ambiguedades

Responde SOLO con un JSON array de 3 a 5 sugerencias en este formato exacto:
[
  {
    "nombre": "Nombre corto descriptivo",
    "categoria": "MARKETING",
    "contenido": "Texto de la plantilla...",
    "explicacion": "Por que cumple las reglas de Meta"
  },
  ...
]

NO incluyas texto fuera del JSON. NO uses markdown. Solo el array JSON puro."""

    user_prompt = f"Genera 3-5 plantillas para: {idea}"

    try:
        headers = {'Content-Type': 'application/json'}
        api_key = sanitize_api_key(settings.provider, decrypt_value(settings.api_key))
        if not api_key:
            logger.error('[AI] Template suggest sin API key valida para provider=%s', settings.provider)
            return None

        if settings.provider == 'gemini':
            headers['x-goog-api-key'] = api_key
        else:
            headers['Authorization'] = f'Bearer {api_key}'

        payload = {
            'model': settings.model or provider_config['default_model'],
            'messages': [
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': user_prompt},
            ],
            'max_tokens': 1500,
            'temperature': 0.7,
        }

        response = requests.post(provider_config['url'], headers=headers, json=payload, timeout=60)
        if response.status_code != 200:
            logger.error('[AI] Template suggest HTTP %s: %s', response.status_code, response.text[:500])
            return None

        data = response.json()
        reply = data.get('choices', [{}])[0].get('message', {}).get('content', '').strip()

        # Extract JSON array from response
        match = re.search(r'\[\s*\{.*\}\s*\]', reply, re.DOTALL)
        if match:
            try:
                suggestions = json.loads(match.group(0))
                if isinstance(suggestions, list):
                    return suggestions[:5]
            except json.JSONDecodeError:
                pass
        return None
    except Exception as err:
        logger.error('[AI] Template suggest error: %s', str(err))
        return None
