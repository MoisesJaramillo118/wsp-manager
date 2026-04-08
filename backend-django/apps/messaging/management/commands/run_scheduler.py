"""
Scheduler management command - sends scheduled messages.
Runs every 60 seconds, checking for messages with estado='programado' and scheduled_at <= now.
Port of scheduler.js from Express backend.
"""
import time
import random
import logging
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.messaging.models import Message
from apps.contacts.models import Contact
from apps.connection.evolution import send_text

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Run the message scheduler (sends scheduled messages every 60 seconds)'

    def handle(self, *args, **options):
        self.stdout.write('[Scheduler] Started. Checking every 60 seconds...')
        while True:
            try:
                self._process_scheduled()
            except Exception as e:
                logger.error(f'[Scheduler] Error: {e}')
            time.sleep(60)

    def _process_scheduled(self):
        now = timezone.now()
        pending = Message.objects.filter(
            estado='programado',
            scheduled_at__lte=now
        ).select_related()

        if not pending.exists():
            return

        count = pending.count()
        logger.info(f'[Scheduler] Found {count} scheduled message(s) to send')

        for msg in pending:
            try:
                contact = None
                if msg.contact_id:
                    contact = Contact.objects.filter(id=msg.contact_id, activo=True).first()

                if contact:
                    send_text(contact.telefono, msg.contenido)
                    msg.estado = 'enviado'
                    msg.sent_at = timezone.now()
                    msg.save()
                    logger.info(f'[Scheduler] Sent to {contact.telefono}')
                else:
                    msg.estado = 'fallido'
                    msg.error_msg = 'Contacto no encontrado'
                    msg.save()

                # Random delay between sends (anti-ban)
                time.sleep(3 + random.random() * 4)

            except Exception as e:
                msg.estado = 'fallido'
                msg.error_msg = str(e)
                msg.save()
                logger.error(f'[Scheduler] Failed: {e}')
