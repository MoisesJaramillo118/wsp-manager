import json
import re
import logging
import requests

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AISettings
from .providers import PROVIDERS, generate_response

logger = logging.getLogger(__name__)


class AISettingsView(APIView):
    def get(self, request):
        try:
            settings = AISettings.objects.get(id=1)
        except AISettings.DoesNotExist:
            return Response({
                'enabled': False,
                'provider': 'openai',
                'api_key_masked': '',
                'has_api_key': False,
                'model': 'gpt-4o-mini',
                'system_prompt': '',
                'max_tokens': 300,
            })

        data = {
            'id': settings.id,
            'enabled': settings.enabled,
            'provider': settings.provider,
            'model': settings.model,
            'system_prompt': settings.system_prompt,
            'max_tokens': settings.max_tokens,
            'updated_at': settings.updated_at,
        }

        if settings.api_key:
            data['api_key_masked'] = settings.api_key[:8] + '...' + settings.api_key[-4:]
            data['has_api_key'] = True
        else:
            data['api_key_masked'] = ''
            data['has_api_key'] = False

        return Response(data)

    def put(self, request):
        try:
            settings = AISettings.objects.get(id=1)
        except AISettings.DoesNotExist:
            settings = AISettings(id=1)

        body = request.data
        if 'enabled' in body:
            settings.enabled = bool(body['enabled'])
        if body.get('provider'):
            settings.provider = body['provider']
        if body.get('api_key'):
            settings.api_key = body['api_key']
        if body.get('model'):
            settings.model = body['model']
        if body.get('system_prompt'):
            settings.system_prompt = body['system_prompt']
        if body.get('max_tokens'):
            settings.max_tokens = int(body['max_tokens'])

        settings.save()
        return Response({'success': True})


class AITestView(APIView):
    def post(self, request):
        message = request.data.get('message', 'Hola, tienen ropa de verano?')
        try:
            reply = generate_response(message, 'Cliente Test', [])
            if reply:
                return Response({'success': True, 'reply': reply})
            else:
                return Response(
                    {'error': 'No se obtuvo respuesta. Verifica que la IA este habilitada y la API key sea correcta.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except Exception as err:
            return Response({'error': str(err)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AISuggestView(APIView):
    def post(self, request):
        from django.db import connection

        remote_phone = request.data.get('remote_phone')
        if not remote_phone:
            return Response({'error': 'remote_phone requerido'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            ai_settings = AISettings.objects.get(id=1)
        except AISettings.DoesNotExist:
            return Response({'suggestions': []})

        if not ai_settings.enabled or not ai_settings.api_key:
            return Response({'suggestions': []})

        # Get last messages for context
        with connection.cursor() as cursor:
            cursor.execute(
                'SELECT message, direction FROM chats WHERE remote_phone = %s ORDER BY created_at DESC LIMIT 8',
                [remote_phone],
            )
            columns = [col[0] for col in cursor.description]
            rows = [dict(zip(columns, row)) for row in cursor.fetchall()]

        history = list(reversed(rows))
        if not history:
            return Response({'suggestions': []})

        last_incoming = None
        for m in history:
            if m['direction'] == 'incoming':
                last_incoming = m
        if not last_incoming:
            return Response({'suggestions': []})

        # Get contact name
        with connection.cursor() as cursor:
            cursor.execute(
                'SELECT remote_name FROM conversations WHERE remote_phone = %s',
                [remote_phone],
            )
            row = cursor.fetchone()
            contact_name = row[0] if row else ''

        try:
            provider_url = {
                'openai': 'https://api.openai.com/v1/chat/completions',
                'groq': 'https://api.groq.com/openai/v1/chat/completions',
                'gemini': 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
            }.get(ai_settings.provider)

            msg_context = '\n'.join(
                f"{'Cliente' if m['direction'] == 'incoming' else 'Asesor'}: {m['message']}"
                for m in history
            )

            headers = {'Content-Type': 'application/json'}
            if ai_settings.provider == 'gemini':
                headers['x-goog-api-key'] = ai_settings.api_key
            else:
                headers['Authorization'] = f'Bearer {ai_settings.api_key}'

            payload = {
                'model': ai_settings.model or 'gpt-4o-mini',
                'messages': [
                    {
                        'role': 'system',
                        'content': (
                            'Eres un asistente que sugiere respuestas para un asesor de ventas de una tienda '
                            'de ropa femenina. Genera exactamente 3 opciones de respuesta cortas (maximo 1-2 '
                            'lineas cada una), naturales y profesionales en espanol. Responde UNICAMENTE con '
                            'un JSON array de 3 strings. Sin explicaciones, sin markdown, solo el array JSON.'
                        ),
                    },
                    {
                        'role': 'user',
                        'content': f'Conversacion reciente:\n{msg_context}\n\nGenera 3 sugerencias de respuesta para el asesor:',
                    },
                ],
                'max_tokens': 300,
                'temperature': 0.8,
            }

            res = requests.post(provider_url, headers=headers, json=payload, timeout=30)
            data = res.json()
            reply = data.get('choices', [{}])[0].get('message', {}).get('content', '')

            if not reply:
                return Response({'suggestions': []})

            # Try to parse JSON array from response
            match = re.search(r'\[[\s\S]*\]', reply)
            if match:
                suggestions = json.loads(match.group(0))
                if isinstance(suggestions, list):
                    return Response({'suggestions': suggestions[:3]})

            return Response({'suggestions': []})

        except Exception as err:
            logger.error('[AI Suggest] Error: %s', str(err))
            return Response({'suggestions': []})
