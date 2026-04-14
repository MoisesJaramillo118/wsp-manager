import logging
import re
import time
import unicodedata

from django.db import models
from django.utils import timezone
from core.public_urls import build_upload_url

logger = logging.getLogger(__name__)

HUMAN_KEYWORDS = [
    'asesor', 'asesora', 'persona real', 'hablar con alguien', 'agente',
    'humano', 'encargado', 'vendedor', 'vendedora', 'quiero hablar',
    'atencion personal', 'persona',
]

CATALOG_TRIGGERS = [
    'catalogo', 'catalog', 'catalogos', 'ver productos', 'lista de productos',
    'que tienen', 'que venden', 'muestrame', 'enviar catalogo', 'mandar catalogo',
    'pasame el catalogo', 'tienen catalogo', 'me envias', 'me mandas', 'me pasas',
    'quiero ver',
]


def detect_needs_human(text):
    """Check if message text contains keywords requesting a human advisor."""
    lower = text.lower()
    return any(k in lower for k in HUMAN_KEYWORDS)


def _strip_accents(text):
    """Remove diacritical marks from text."""
    nfkd = unicodedata.normalize('NFD', text)
    return ''.join(c for c in nfkd if unicodedata.category(c) != 'Mn')


def detect_catalog_request(text):
    """Detect if message requests a catalog. Returns list of matching Catalog objects."""
    lower = _strip_accents(text.lower())

    is_catalog_request = any(t in lower for t in CATALOG_TRIGGERS)
    if not is_catalog_request:
        return []

    from apps.catalogs.models import Catalog
    catalogs = list(Catalog.objects.filter(activo=True))
    if not catalogs:
        return []

    # Match catalogs whose keywords appear in the message
    matched = []
    for cat in catalogs:
        kws = _strip_accents(f"{cat.keywords} {cat.nombre} {cat.categoria}".lower())
        kw_arr = [k.strip() for k in kws.replace(',', ' ').replace(';', ' ').split() if len(k.strip()) > 2]
        if any(kw in lower for kw in kw_arr):
            matched.append(cat)

    if matched:
        return matched

    # If "todos" or "catalogos" or "todo lo que", send all
    if 'todos' in lower or 'catalogos' in lower or 'todo lo que' in lower:
        return catalogs

    # Otherwise send the general / first catalog
    general = next((c for c in catalogs if c.categoria == 'general'), catalogs[0] if catalogs else None)
    return [general] if general else []


def send_catalogs(catalogs_to_send, remote_phone, remote_name):
    """Send catalog PDFs via Evolution API and log them. Returns list of sent names."""
    from apps.connection.evolution import send_document
    from apps.conversations.models import Chat
    from apps.catalogs.models import Catalog

    sent = []
    for cat in catalogs_to_send:
        try:
            file_url = build_upload_url(cat.filename)
            if not file_url:
                logger.error('[Catalog] No public URL available for "%s"', cat.nombre)
                continue
            send_document(remote_phone, file_url, f"{cat.nombre}.pdf")
            Chat.objects.create(
                remote_phone=remote_phone,
                remote_name=remote_name,
                message=f"[Catalogo enviado: {cat.nombre}]",
                direction='outgoing',
                is_ai_response=True,
            )
            Catalog.objects.filter(id=cat.id).update(downloads=models.F('downloads') + 1)
            sent.append(cat.nombre)
            logger.info('[Catalog] Sent "%s" to %s', cat.nombre, remote_phone)
            if len(catalogs_to_send) > 1:
                time.sleep(1.5)
        except Exception as e:
            logger.error("[Catalog] Failed to send '%s': %s", cat.nombre, e)
    return sent


def process_ai_catalog_tags(ai_reply, remote_phone, remote_name):
    """Extract [CATALOGO:nombre] tags from AI response and send matching catalogs.

    Returns (clean_reply, sent_names_list).
    """
    tag_regex = r'\[CATALOGO[:\s]*([^\]]+)\]'
    matches = list(re.finditer(tag_regex, ai_reply, re.IGNORECASE))
    if not matches:
        return ai_reply, []

    from apps.catalogs.models import Catalog
    from apps.connection.evolution import send_document
    from apps.conversations.models import Chat

    catalogs = list(Catalog.objects.filter(activo=True))
    to_send = []

    for match in matches:
        requested = _strip_accents(match.group(1).strip().lower())
        for c in catalogs:
            cat_name = _strip_accents(c.nombre.lower())
            if cat_name in requested or requested in cat_name:
                if c.id not in [t.id for t in to_send]:
                    to_send.append(c)

    # If AI said [CATALOGO:todos] or similar
    if any('todo' in m.group(1).lower() for m in matches):
        for c in catalogs:
            if c.id not in [t.id for t in to_send]:
                to_send.append(c)

    # Remove tags from reply
    clean_reply = re.sub(tag_regex, '', ai_reply, flags=re.IGNORECASE)
    clean_reply = re.sub(r'\s{2,}', ' ', clean_reply).strip()

    # Send catalogs synchronously
    sent = []
    for cat in to_send:
        try:
            file_url = build_upload_url(cat.filename)
            if not file_url:
                logger.error('[AI+Catalog] No public URL available for "%s"', cat.nombre)
                continue
            send_document(remote_phone, file_url, f"{cat.nombre}.pdf")
            Chat.objects.create(
                remote_phone=remote_phone,
                remote_name=remote_name,
                message=f"[Catalogo enviado: {cat.nombre}]",
                direction='outgoing',
                is_ai_response=True,
            )
            Catalog.objects.filter(id=cat.id).update(downloads=models.F('downloads') + 1)
            sent.append(cat.nombre)
            if len(to_send) > 1:
                time.sleep(1.5)
        except Exception as e:
            logger.error("[AI+Catalog] Failed: %s", e)

    return clean_reply, sent


def clean_ai_tags(text):
    """Remove all internal AI tags ([ASESOR], [CATALOGO:...]) from text."""
    text = re.sub(r'\[ASESOR\]', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\[CATALOGO[:\s]*[^\]]*\]', '', text, flags=re.IGNORECASE)
    return re.sub(r'\s{2,}', ' ', text).strip()


def upsert_conversation(phone, name, status, needs_human):
    """Create or update a conversation record for the given phone."""
    from apps.conversations.models import Conversation

    try:
        conv = Conversation.objects.get(remote_phone=phone)
        new_status = status
        # Don't downgrade status if already assigned
        if conv.status == 'asignado' and status != 'resuelto':
            new_status = 'asignado'
        if needs_human:
            new_status = 'necesita_asesor'
        if name:
            conv.remote_name = name
        conv.status = new_status
        conv.needs_human = conv.needs_human or needs_human
        conv.last_message_at = timezone.now()
        conv.save()
    except Conversation.DoesNotExist:
        Conversation.objects.create(
            remote_phone=phone,
            remote_name=name or '',
            status='necesita_asesor' if needs_human else status,
            needs_human=needs_human,
        )
