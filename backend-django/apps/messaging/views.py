import random
import threading
import time
import uuid

from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.connection.evolution import send_text, EvolutionAPIError
from apps.contacts.models import Contact

from .models import Message, QuickReply, Template
from .serializers import MessageSerializer, QuickReplySerializer, TemplateSerializer


def replace_vars(text, contact):
    """Replace {{nombre}} and {{telefono}} placeholders with contact data."""
    result = text.replace('{{nombre}}', contact.nombre or '')
    result = result.replace('{{telefono}}', contact.telefono or '')
    return result


# ---------------------------------------------------------------------------
# Templates
# ---------------------------------------------------------------------------

class TemplateList(APIView):
    def get(self, request):
        qs = Template.objects.filter(activo=True)
        categoria = request.query_params.get('categoria')
        if categoria:
            qs = qs.filter(categoria=categoria)
        serializer = TemplateSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = TemplateSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TemplateDetail(APIView):
    def put(self, request, pk):
        try:
            template = Template.objects.get(pk=pk)
        except Template.DoesNotExist:
            return Response({'error': 'Template no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        serializer = TemplateSerializer(template, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        try:
            template = Template.objects.get(pk=pk)
        except Template.DoesNotExist:
            return Response({'error': 'Template no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        template.activo = False
        template.save(update_fields=['activo'])
        return Response({'success': True, 'message': 'Template desactivado'})


# ---------------------------------------------------------------------------
# Send Individual
# ---------------------------------------------------------------------------

class SendIndividual(APIView):
    def post(self, request):
        contact_id = request.data.get('contact_id')
        template_id = request.data.get('template_id')
        contenido = request.data.get('contenido', '')

        if not contact_id:
            return Response({'error': 'contact_id es requerido'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            contact = Contact.objects.get(pk=contact_id)
        except Contact.DoesNotExist:
            return Response({'error': 'Contacto no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        # If template_id provided, use template content
        if template_id and not contenido:
            try:
                template = Template.objects.get(pk=template_id)
                contenido = template.contenido
            except Template.DoesNotExist:
                return Response({'error': 'Template no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        if not contenido:
            return Response({'error': 'contenido es requerido'}, status=status.HTTP_400_BAD_REQUEST)

        # Replace variables
        final_text = replace_vars(contenido, contact)

        # Send via Evolution API
        try:
            send_text(contact.telefono, final_text)
        except EvolutionAPIError as e:
            # Save as failed message
            msg = Message.objects.create(
                contact_id=contact_id,
                template_id=template_id,
                contenido=final_text,
                tipo='individual',
                estado='fallido',
                error_msg=str(e),
            )
            return Response(
                {'error': str(e), 'message_id': msg.pk},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Save as sent
        msg = Message.objects.create(
            contact_id=contact_id,
            template_id=template_id,
            contenido=final_text,
            tipo='individual',
            estado='enviado',
            sent_at=timezone.now(),
        )

        return Response({'success': True, 'message_id': msg.pk})


# ---------------------------------------------------------------------------
# Send Bulk
# ---------------------------------------------------------------------------

def _send_bulk_worker(batch_id, contact_ids, contenido, template_id):
    """Background worker that sends messages with 3-7s delays."""
    for cid in contact_ids:
        try:
            contact = Contact.objects.get(pk=cid)
            final_text = replace_vars(contenido, contact)

            send_text(contact.telefono, final_text)

            Message.objects.filter(
                batch_id=batch_id, contact_id=cid
            ).update(estado='enviado', sent_at=timezone.now())

        except (Contact.DoesNotExist, EvolutionAPIError, Exception) as e:
            Message.objects.filter(
                batch_id=batch_id, contact_id=cid
            ).update(estado='fallido', error_msg=str(e))

        # Random delay between 3-7 seconds
        delay = random.uniform(3, 7)
        time.sleep(delay)


class SendBulk(APIView):
    def post(self, request):
        contact_ids = request.data.get('contact_ids', [])
        grupo_id = request.data.get('grupo_id')
        template_id = request.data.get('template_id')
        contenido = request.data.get('contenido', '')

        # Resolve contact_ids from grupo_id if needed
        if grupo_id and not contact_ids:
            contact_ids = list(
                Contact.objects.filter(grupo_id=grupo_id, activo=True)
                .values_list('id', flat=True)
            )

        if not contact_ids:
            return Response({'error': 'No se encontraron contactos'}, status=status.HTTP_400_BAD_REQUEST)

        # Limit to 50
        contact_ids = contact_ids[:50]

        # If template_id provided, use template content
        if template_id and not contenido:
            try:
                template = Template.objects.get(pk=template_id)
                contenido = template.contenido
            except Template.DoesNotExist:
                return Response({'error': 'Template no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        if not contenido:
            return Response({'error': 'contenido es requerido'}, status=status.HTTP_400_BAD_REQUEST)

        batch_id = str(uuid.uuid4())

        # Create all messages as 'pendiente'
        messages = []
        for cid in contact_ids:
            messages.append(Message(
                contact_id=cid,
                template_id=template_id,
                contenido=contenido,
                tipo='masivo',
                estado='pendiente',
                batch_id=batch_id,
            ))
        Message.objects.bulk_create(messages)

        # Send asynchronously in background thread
        thread = threading.Thread(
            target=_send_bulk_worker,
            args=(batch_id, contact_ids, contenido, template_id),
            daemon=True,
        )
        thread.start()

        return Response({
            'success': True,
            'batch_id': batch_id,
            'total': len(contact_ids),
        })


# ---------------------------------------------------------------------------
# Send Schedule
# ---------------------------------------------------------------------------

class SendSchedule(APIView):
    def post(self, request):
        contact_ids = request.data.get('contact_ids', [])
        grupo_id = request.data.get('grupo_id')
        template_id = request.data.get('template_id')
        contenido = request.data.get('contenido', '')
        scheduled_at = request.data.get('scheduled_at')

        if not scheduled_at:
            return Response({'error': 'scheduled_at es requerido'}, status=status.HTTP_400_BAD_REQUEST)

        # Resolve contact_ids from grupo_id if needed
        if grupo_id and not contact_ids:
            contact_ids = list(
                Contact.objects.filter(grupo_id=grupo_id, activo=True)
                .values_list('id', flat=True)
            )

        if not contact_ids:
            return Response({'error': 'No se encontraron contactos'}, status=status.HTTP_400_BAD_REQUEST)

        # If template_id provided, use template content
        if template_id and not contenido:
            try:
                template = Template.objects.get(pk=template_id)
                contenido = template.contenido
            except Template.DoesNotExist:
                return Response({'error': 'Template no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        if not contenido:
            return Response({'error': 'contenido es requerido'}, status=status.HTTP_400_BAD_REQUEST)

        batch_id = str(uuid.uuid4())

        messages = []
        for cid in contact_ids:
            messages.append(Message(
                contact_id=cid,
                template_id=template_id,
                contenido=contenido,
                tipo='masivo',
                estado='programado',
                scheduled_at=scheduled_at,
                batch_id=batch_id,
            ))
        Message.objects.bulk_create(messages)

        return Response({
            'success': True,
            'batch_id': batch_id,
            'total': len(contact_ids),
        })


# ---------------------------------------------------------------------------
# Quick Replies
# ---------------------------------------------------------------------------

class QuickReplyList(APIView):
    def get(self, request):
        advisor_id = request.query_params.get('advisor_id')
        qs = QuickReply.objects.filter(activo=True)
        if advisor_id:
            qs = qs.filter(Q(advisor_id__isnull=True) | Q(advisor_id=advisor_id))
        serializer = QuickReplySerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = QuickReplySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class QuickReplyDetail(APIView):
    def put(self, request, pk):
        try:
            qr = QuickReply.objects.get(pk=pk)
        except QuickReply.DoesNotExist:
            return Response({'error': 'Respuesta rapida no encontrada'}, status=status.HTTP_404_NOT_FOUND)

        serializer = QuickReplySerializer(qr, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        try:
            qr = QuickReply.objects.get(pk=pk)
        except QuickReply.DoesNotExist:
            return Response({'error': 'Respuesta rapida no encontrada'}, status=status.HTTP_404_NOT_FOUND)

        qr.delete()
        return Response({'success': True, 'message': 'Respuesta rapida eliminada'})
