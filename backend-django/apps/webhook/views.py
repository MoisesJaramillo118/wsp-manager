import json
import logging
import threading

from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response

logger = logging.getLogger(__name__)


def _process_webhook(body):
    """Process an incoming webhook event in a background thread.

    This faithfully ports the Express.js webhook handler (server.js lines 201-461).
    """
    from apps.conversations.models import Chat, Conversation, ConversationOrigen
    from apps.connection.evolution import send_text
    from apps.ai.providers import generate_response
    from apps.webhook.services import (
        detect_needs_human,
        detect_catalog_request,
        send_catalogs,
        process_ai_catalog_tags,
        clean_ai_tags,
        upsert_conversation,
    )
    from apps.ai.models import AISettings

    try:
        event = (body.get('event', '') or '').lower().replace('_', '.')

        logger.info('[Webhook] Event received: %s', body.get('event', ''))

        if 'messages' not in event or 'upsert' not in event:
            return

        data = body.get('data')
        if not data:
            return

        key = data.get('key') or {}
        if key.get('fromMe'):
            return

        remote_jid = key.get('remoteJid', '')
        if '@g.us' in remote_jid or remote_jid == 'status@broadcast':
            return

        remote_phone = remote_jid.replace('@s.whatsapp.net', '')
        remote_name = data.get('pushName') or data.get('verifiedBizName') or ''

        msg = data.get('message') or {}
        message_text = (
            msg.get('conversation')
            or (msg.get('extendedTextMessage') or {}).get('text')
            or (msg.get('imageMessage') or {}).get('caption')
            or (msg.get('videoMessage') or {}).get('caption')
            or (msg.get('buttonsResponseMessage') or {}).get('selectedDisplayText')
            or (msg.get('listResponseMessage') or {}).get('title')
            or ''
        )

        if not message_text.strip():
            return

        logger.info(
            '[Webhook] Incoming from %s (%s): %s',
            remote_phone, remote_name, message_text[:80],
        )

        # Save incoming message
        Chat.objects.create(
            remote_phone=remote_phone,
            remote_name=remote_name,
            message=message_text,
            direction='incoming',
        )

        # Detect conversation origin (Instagram, FB Ads, etc.)
        existing_origen = ConversationOrigen.objects.filter(remote_phone=remote_phone).first()
        if not existing_origen:
            origen = 'directo'
            lower = message_text.lower()
            ctx = json.dumps(
                data.get('contextInfo')
                or (msg.get('extendedTextMessage') or {}).get('contextInfo')
                or {}
            ).lower()

            # Meta Ads Click-to-WhatsApp detection (highest priority)
            if 'ctwa_clid' in ctx or 'fbclid' in ctx:
                # Check if it came from Instagram or Facebook specifically
                if 'instagram' in ctx:
                    origen = 'instagram'
                else:
                    origen = 'facebook_ads'
            elif 'instagram' in ctx or 'vi en instagram' in lower or 'los vi en ig' in lower or 'instagram' in lower:
                origen = 'instagram'
            elif 'facebook' in ctx or 'vi en facebook' in lower or 'fb' in lower or 'anuncio' in lower or 'publicidad' in lower:
                origen = 'facebook_ads'
            elif 'tiktok' in lower or 'vi en tiktok' in lower:
                origen = 'tiktok'
            elif 'recomend' in lower or 'me dijeron' in lower or 'mi amiga' in lower:
                origen = 'referido'
            elif 'ctwa_clid' in ctx or 'fbclid' in ctx:
                origen = 'facebook_ads'

            ConversationOrigen.objects.get_or_create(
                remote_phone=remote_phone,
                defaults={'origen': origen},
            )
            if origen != 'directo':
                logger.info('[Origen] %s detected as: %s', remote_phone, origen)

        # Detect if client wants human
        client_wants_human = detect_needs_human(message_text)
        if client_wants_human:
            logger.info('[Webhook] Client %s is requesting a human advisor!', remote_phone)

        # Check AI settings and conversation status
        try:
            ai_settings = AISettings.objects.get(id=1)
        except AISettings.DoesNotExist:
            ai_settings = None

        conv = Conversation.objects.filter(remote_phone=remote_phone).first()
        is_assigned = conv.status == 'asignado' if conv else False

        # Direct catalog detection
        direct_catalog_matches = detect_catalog_request(message_text)
        catalogs_sent_direct = []

        if direct_catalog_matches and not is_assigned:
            catalogs_sent_direct = send_catalogs(direct_catalog_matches, remote_phone, remote_name)
            if catalogs_sent_direct:
                if len(catalogs_sent_direct) == 1:
                    catalog_msg = (
                        f"Aqui tienes nuestro catalogo de {catalogs_sent_direct[0]}. "
                        f"Si necesitas ayuda con algo mas, no dudes en escribirnos!"
                    )
                else:
                    catalog_msg = (
                        f"Te envio {len(catalogs_sent_direct)} catalogos: "
                        f"{', '.join(catalogs_sent_direct)}. "
                        f"Si necesitas ayuda con algo mas, no dudes en escribirnos!"
                    )
                send_text(remote_phone, catalog_msg)
                Chat.objects.create(
                    remote_phone=remote_phone,
                    remote_name=remote_name,
                    message=catalog_msg,
                    direction='outgoing',
                    is_ai_response=True,
                )

        # AI auto-response (if enabled and not assigned to advisor)
        if ai_settings and ai_settings.enabled and ai_settings.api_key and not is_assigned:
            history = list(
                Chat.objects.filter(remote_phone=remote_phone)
                .order_by('-created_at')[:10]
                .values('message', 'direction')
            )
            history.reverse()

            # Include catalog info in AI context
            from apps.catalogs.models import Catalog
            catalogs = list(
                Catalog.objects.filter(activo=True).values(
                    'nombre', 'categoria', 'descripcion', 'keywords'
                )
            )
            catalog_context = ''
            if catalogs:
                catalog_list = '\n'.join(
                    f'- "{c["nombre"]}" ({c["categoria"]}'
                    f'{", keywords: " + c["keywords"] if c["keywords"] else ""}'
                    f'{" - " + c["descripcion"] if c["descripcion"] else ""})'
                    for c in catalogs
                )
                already_sent = ''
                if catalogs_sent_direct:
                    already_sent = (
                        f'\n\nNOTA: Ya se enviaron automaticamente estos catalogos al cliente: '
                        f'{", ".join(catalogs_sent_direct)}. '
                        f'NO los vuelvas a enviar, solo confirma que se los enviaste.'
                    )
                catalog_context = (
                    f'\n\nCATALOGOS DISPONIBLES:\n{catalog_list}\n\n'
                    f'INSTRUCCIONES DE CATALOGOS:\n'
                    f'- Si el cliente pide un catalogo que NO se le envio aun, incluye la etiqueta '
                    f'[CATALOGO:nombre] en tu respuesta (reemplaza "nombre" con el nombre exacto del catalogo). '
                    f'El sistema lo enviara automaticamente.\n'
                    f'- Si quieres enviar varios, usa una etiqueta por cada uno: [CATALOGO:Verano] [CATALOGO:Invierno]\n'
                    f'- Si quieres enviar todos: [CATALOGO:todos]\n'
                    f'- La etiqueta se eliminara del mensaje antes de enviarlo al cliente, asi que redacta tu texto de forma natural.\n'
                    f'- Ejemplo: "Con gusto te envio el catalogo! [CATALOGO:Verano] Ahi encontraras toda nuestra coleccion."'
                    f'{already_sent}'
                )

            ai_reply = generate_response(message_text, remote_name, history, catalog_context)
            if ai_reply:
                try:
                    # Process any [CATALOGO:xxx] tags in AI response
                    clean_reply, ai_catalogs_sent = process_ai_catalog_tags(
                        ai_reply, remote_phone, remote_name
                    )

                    if ai_catalogs_sent:
                        logger.info(
                            '[AI+Catalog] AI triggered sending: %s to %s',
                            ', '.join(ai_catalogs_sent), remote_phone,
                        )

                    # Send the cleaned text reply
                    final_reply = clean_ai_tags(clean_reply)
                    if final_reply:
                        send_text(remote_phone, final_reply)
                        Chat.objects.create(
                            remote_phone=remote_phone,
                            remote_name=remote_name,
                            message=final_reply,
                            direction='outgoing',
                            is_ai_response=True,
                        )
                        logger.info('[AI] Replied to %s: %s', remote_phone, final_reply[:80])

                    ai_suggests_human = (
                        detect_needs_human(ai_reply)
                        or '[asesor]' in ai_reply.lower()
                    )
                    upsert_conversation(
                        remote_phone, remote_name, 'ia_atendido',
                        client_wants_human or ai_suggests_human,
                    )
                except Exception as send_err:
                    logger.error('[AI] Failed to send reply: %s', send_err)
                    upsert_conversation(remote_phone, remote_name, 'sin_responder', client_wants_human)
            else:
                # AI didn't respond but catalogs may have been sent directly
                if catalogs_sent_direct:
                    upsert_conversation(remote_phone, remote_name, 'ia_atendido', False)
                else:
                    upsert_conversation(remote_phone, remote_name, 'sin_responder', client_wants_human)
        else:
            # No AI or assigned to advisor
            if not is_assigned:
                if catalogs_sent_direct:
                    upsert_conversation(remote_phone, remote_name, 'ia_atendido', False)
                else:
                    upsert_conversation(remote_phone, remote_name, 'sin_responder', client_wants_human)
            else:
                # Just update last_message_at for assigned conversations
                Conversation.objects.filter(remote_phone=remote_phone).update(
                    last_message_at=timezone.now()
                )

    except Exception as err:
        logger.error('[Webhook] Error processing message: %s', err, exc_info=True)


class WebhookView(APIView):
    """Incoming messages webhook from Evolution API.

    Returns 200 immediately and processes the message in a background thread.
    """

    def post(self, request):
        body = request.data
        thread = threading.Thread(target=_process_webhook, args=(body,), daemon=True)
        thread.start()
        return Response({'received': True})
