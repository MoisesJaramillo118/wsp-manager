import math
from datetime import datetime

from django.db import connection
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.connection.evolution import send_text, EvolutionAPIError
from apps.tags.models import ConversationTag, Tag
from .models import Chat, Conversation, ConversationOrigen, InternalNote


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _dictfetchall(cursor):
    """Return all rows from a cursor as a list of dicts."""
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def _dictfetchone(cursor):
    columns = [col[0] for col in cursor.description]
    row = cursor.fetchone()
    return dict(zip(columns, row)) if row else None


def _get_remote_name(phone):
    """Get the remote_name from the first chat record for a phone."""
    row = Chat.objects.filter(remote_phone=phone).values_list('remote_name', flat=True).first()
    return row or ''


# ---------------------------------------------------------------------------
# 1. GET /api/chats/  — List conversations (paginated)
# ---------------------------------------------------------------------------

class ChatListView(APIView):
    """
    Complex grouped query joining chats, conversations, and advisors.
    Uses raw SQL because of GROUP BY + correlated subqueries.
    Feature a: page/limit pagination (default page=1, limit=30).
    """

    def get(self, request):
        status_filter = request.query_params.get('status')
        advisor_id = request.query_params.get('advisor_id')
        my_view = request.query_params.get('my_view')
        page = int(request.query_params.get('page', 1))
        limit = int(request.query_params.get('limit', 30))

        sql = """
            SELECT
                c1.remote_phone,
                COALESCE(cv.remote_name, MAX(c1.remote_name)) AS remote_name,
                MAX(c1.created_at) AS last_message_at,
                (SELECT message FROM chats c2
                 WHERE c2.remote_phone = c1.remote_phone
                 ORDER BY c2.created_at DESC LIMIT 1) AS last_message,
                (SELECT direction FROM chats c3
                 WHERE c3.remote_phone = c1.remote_phone
                 ORDER BY c3.created_at DESC LIMIT 1) AS last_direction,
                COUNT(*) AS total_messages,
                SUM(CASE WHEN c1.direction = 'incoming' THEN 1 ELSE 0 END) AS incoming_count,
                COALESCE(cv.status, 'sin_responder') AS status,
                cv.needs_human,
                cv.advisor_id,
                a.nombre AS advisor_nombre,
                a.color AS advisor_color
            FROM chats c1
            LEFT JOIN conversations cv ON cv.remote_phone = c1.remote_phone
            LEFT JOIN advisors a ON a.id = cv.advisor_id
        """
        params = []
        where = []

        if status_filter:
            if status_filter == 'sin_responder':
                where.append("(cv.status = 'sin_responder' OR cv.status IS NULL)")
            elif status_filter == 'sin_asignar':
                where.append(
                    "(cv.advisor_id IS NULL AND COALESCE(cv.status, 'sin_responder') != 'resuelto')"
                )
            else:
                where.append('cv.status = %s')
                params.append(status_filter)

        if my_view:
            my_id = int(my_view)
            if status_filter == 'resuelto':
                where.append('cv.advisor_id = %s')
            else:
                where.append(
                    '(cv.advisor_id = %s OR cv.advisor_id IS NULL OR cv.status IS NULL)'
                )
                where.append("COALESCE(cv.status, 'sin_responder') != 'resuelto'")
            params.append(my_id)
        elif advisor_id:
            where.append('cv.advisor_id = %s')
            params.append(int(advisor_id))

        if where:
            sql += ' WHERE ' + ' AND '.join(where)

        sql += ' GROUP BY c1.remote_phone ORDER BY last_message_at DESC'

        # ----- count total for pagination -----
        count_sql = f'SELECT COUNT(*) FROM ({sql})'
        with connection.cursor() as cursor:
            cursor.execute(count_sql, params)
            total = cursor.fetchone()[0]

        # ----- apply pagination -----
        offset = (page - 1) * limit
        sql += ' LIMIT %s OFFSET %s'
        params.extend([limit, offset])

        with connection.cursor() as cursor:
            cursor.execute(sql, params)
            conversations = _dictfetchall(cursor)

        # Return flat array for compatibility with frontend (Express returned array)
        return Response(conversations)


# ---------------------------------------------------------------------------
# 2. GET /api/chats/stats
# ---------------------------------------------------------------------------

class ChatStatsView(APIView):

    def get(self, request):
        with connection.cursor() as c:
            c.execute('SELECT COUNT(DISTINCT remote_phone) FROM chats')
            total = c.fetchone()[0]

            c.execute("SELECT COUNT(*) FROM conversations WHERE status = 'sin_responder'")
            sin_responder = c.fetchone()[0]

            c.execute(
                "SELECT COUNT(*) FROM conversations "
                "WHERE needs_human = 1 AND status != 'resuelto'"
            )
            necesita_asesor = c.fetchone()[0]

            c.execute("SELECT COUNT(*) FROM conversations WHERE status = 'asignado'")
            asignados = c.fetchone()[0]

            c.execute("SELECT COUNT(*) FROM conversations WHERE status = 'resuelto'")
            resueltos = c.fetchone()[0]

            c.execute("SELECT COUNT(*) FROM conversations WHERE status = 'ia_atendido'")
            ia_atendido = c.fetchone()[0]

            # Chats without a conversations record count as sin_responder
            c.execute(
                "SELECT COUNT(DISTINCT c.remote_phone) FROM chats c "
                "LEFT JOIN conversations cv ON cv.remote_phone = c.remote_phone "
                "WHERE cv.id IS NULL"
            )
            sin_registro = c.fetchone()[0]

            c.execute(
                "SELECT COUNT(*) FROM conversations "
                "WHERE advisor_id IS NULL AND status != 'resuelto'"
            )
            sin_asignar = c.fetchone()[0]

        return Response({
            'total': total,
            'sin_responder': sin_responder + sin_registro,
            'necesita_asesor': necesita_asesor,
            'asignados': asignados,
            'sin_asignar': sin_asignar + sin_registro,
            'ia_atendido': ia_atendido,
            'resueltos': resueltos,
        })


# ---------------------------------------------------------------------------
# 3. GET /api/chats/<phone>/  — Timeline (messages + notes)
# ---------------------------------------------------------------------------

class ChatDetailView(APIView):
    """
    Feature a: cursor pagination via `before` timestamp param.
    Returns messages + notes merged and sorted by created_at.
    """

    def get(self, request, phone):
        limit_val = int(request.query_params.get('limit', 100))
        before = request.query_params.get('before')  # ISO timestamp for cursor pagination

        # --- messages ---
        msg_sql = (
            "SELECT *, 'message' AS entry_type FROM chats "
            "WHERE remote_phone = %s"
        )
        msg_params = [phone]
        if before:
            msg_sql += ' AND created_at < %s'
            msg_params.append(before)
        msg_sql += ' ORDER BY created_at DESC LIMIT %s'
        msg_params.append(limit_val)

        # --- notes (no limit — they are few) ---
        note_sql = (
            "SELECT id, remote_phone, advisor_id, advisor_nombre, note, "
            "created_at, 'note' AS entry_type FROM internal_notes "
            "WHERE remote_phone = %s"
        )
        note_params = [phone]
        if before:
            note_sql += ' AND created_at < %s'
            note_params.append(before)
        note_sql += ' ORDER BY created_at ASC'

        with connection.cursor() as c:
            c.execute(msg_sql, msg_params)
            messages = _dictfetchall(c)

            c.execute(note_sql, note_params)
            notes = _dictfetchall(c)

        # Merge and sort ascending
        timeline = sorted(messages + notes, key=lambda r: r['created_at'])

        # --- conversation info ---
        with connection.cursor() as c:
            c.execute(
                "SELECT cv.*, a.nombre AS advisor_nombre, a.color AS advisor_color "
                "FROM conversations cv "
                "LEFT JOIN advisors a ON a.id = cv.advisor_id "
                "WHERE cv.remote_phone = %s",
                [phone],
            )
            conv = _dictfetchone(c)

        return Response({'messages': timeline, 'conversation': conv})


# ---------------------------------------------------------------------------
# 4. POST /api/chats/<phone>/send  — Send message via Evolution API
# ---------------------------------------------------------------------------

class ChatSendView(APIView):

    def post(self, request, phone):
        message = request.data.get('message')
        if not message:
            return Response(
                {'error': 'message es requerido'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            send_text(phone, message)
        except EvolutionAPIError as exc:
            return Response(
                {'error': str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        remote_name = _get_remote_name(phone)
        Chat.objects.create(
            remote_phone=phone,
            remote_name=remote_name,
            message=message,
            direction='outgoing',
            sent_via='evolution',
        )

        # If conversation exists and is sin_responder, mark ia_atendido
        try:
            conv = Conversation.objects.get(remote_phone=phone)
            if conv.status == 'sin_responder':
                conv.status = 'ia_atendido'
                conv.save(update_fields=['status', 'last_message_at'])
        except Conversation.DoesNotExist:
            pass

        return Response({'success': True})


# ---------------------------------------------------------------------------
# 5. PUT /api/chats/<phone>/assign  — Assign / unassign advisor
# ---------------------------------------------------------------------------

class ChatAssignView(APIView):

    def put(self, request, phone):
        advisor_id = request.data.get('advisor_id')
        is_unassign = not advisor_id

        try:
            conv = Conversation.objects.get(remote_phone=phone)
            if is_unassign:
                conv.advisor_id = None
                conv.status = 'sin_responder'
            else:
                conv.advisor_id = int(advisor_id)
                conv.status = 'asignado'
            conv.save(update_fields=['advisor_id', 'status', 'last_message_at'])
        except Conversation.DoesNotExist:
            if not is_unassign:
                name = _get_remote_name(phone)
                Conversation.objects.create(
                    remote_phone=phone,
                    remote_name=name,
                    status='asignado',
                    advisor_id=int(advisor_id),
                )

        return Response({'success': True})


# ---------------------------------------------------------------------------
# 6. PUT /api/chats/<phone>/status  — Update conversation status
# ---------------------------------------------------------------------------

VALID_STATUSES = {'sin_responder', 'ia_atendido', 'necesita_asesor', 'asignado', 'resuelto'}


class ChatStatusView(APIView):

    def put(self, request, phone):
        new_status = request.data.get('status')
        if new_status not in VALID_STATUSES:
            return Response(
                {'error': 'Estado no valido'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            conv = Conversation.objects.get(remote_phone=phone)
            conv.status = new_status
            if new_status == 'resuelto':
                conv.needs_human = False
            elif new_status in ('sin_responder', 'ia_atendido'):
                conv.advisor_id = None
                conv.needs_human = False
            conv.save(update_fields=['status', 'needs_human', 'advisor_id', 'last_message_at'])
        except Conversation.DoesNotExist:
            name = _get_remote_name(phone)
            Conversation.objects.create(
                remote_phone=phone,
                remote_name=name,
                status=new_status,
            )

        return Response({'success': True})


# ---------------------------------------------------------------------------
# 7. PUT /api/chats/<phone>/outcome  — Set outcome
# ---------------------------------------------------------------------------

VALID_OUTCOMES = {'pendiente', 'venta_cerrada', 'venta_perdida'}


class ChatOutcomeView(APIView):

    def put(self, request, phone):
        outcome = request.data.get('outcome')
        if outcome not in VALID_OUTCOMES:
            return Response(
                {'error': 'Outcome no valido'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            conv = Conversation.objects.get(remote_phone=phone)
            conv.outcome = outcome
            conv.save(update_fields=['outcome', 'last_message_at'])
        except Conversation.DoesNotExist:
            name = _get_remote_name(phone)
            Conversation.objects.create(
                remote_phone=phone,
                remote_name=name,
                outcome=outcome,
            )

        return Response({'success': True})


# ---------------------------------------------------------------------------
# 8-9. Notes CRUD  GET / POST /api/chats/<phone>/notes
# ---------------------------------------------------------------------------

class ChatNoteListCreate(APIView):

    def get(self, request, phone):
        notes = InternalNote.objects.filter(remote_phone=phone).order_by('created_at')
        data = list(notes.values())
        return Response(data)

    def post(self, request, phone):
        note_text = request.data.get('note')
        if not note_text:
            return Response(
                {'error': 'Nota requerida'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        obj = InternalNote.objects.create(
            remote_phone=phone,
            advisor_id=request.data.get('advisor_id') or None,
            advisor_nombre=request.data.get('advisor_nombre', ''),
            note=note_text,
        )
        return Response({'id': obj.pk})


# ---------------------------------------------------------------------------
# 10. DELETE /api/notes/<id>
# ---------------------------------------------------------------------------

class NoteDelete(APIView):

    def delete(self, request, pk):
        InternalNote.objects.filter(pk=pk).delete()
        return Response({'success': True})


# ---------------------------------------------------------------------------
# 11-13. Tags  GET / POST / DELETE  /api/chats/<phone>/tags
# ---------------------------------------------------------------------------

class ChatTagListCreate(APIView):

    def get(self, request, phone):
        tags = Tag.objects.filter(
            conversationtag__conversation_phone=phone,
        ).values()
        return Response(list(tags))

    def post(self, request, phone):
        tag_id = request.data.get('tag_id')
        ConversationTag.objects.get_or_create(
            conversation_phone=phone,
            tag_id=tag_id,
        )
        return Response({'success': True})


class ChatTagRemove(APIView):

    def delete(self, request, phone, tag_id):
        ConversationTag.objects.filter(
            conversation_phone=phone,
            tag_id=tag_id,
        ).delete()
        return Response({'success': True})


# ---------------------------------------------------------------------------
# 14. POST /api/advisors/auto-assign/<phone>
# ---------------------------------------------------------------------------

class AutoAssignView(APIView):

    def post(self, request, phone):
        with connection.cursor() as c:
            c.execute(
                "SELECT id, nombre, color, max_chats, chats_activos FROM ("
                "  SELECT a.id, a.nombre, a.color, a.max_chats, "
                "    (SELECT COUNT(*) FROM conversations c "
                "     WHERE c.advisor_id = a.id AND c.status = 'asignado') AS chats_activos "
                "  FROM advisors a "
                "  WHERE a.activo = 1"
                ") sub "
                "WHERE chats_activos < max_chats "
                "ORDER BY chats_activos ASC "
                "LIMIT 1"
            )
            advisor = _dictfetchone(c)

        if not advisor:
            return Response(
                {'error': 'No hay asesores disponibles'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            conv = Conversation.objects.get(remote_phone=phone)
            conv.advisor_id = advisor['id']
            conv.status = 'asignado'
            conv.save(update_fields=['advisor_id', 'status', 'last_message_at'])
        except Conversation.DoesNotExist:
            name = _get_remote_name(phone)
            Conversation.objects.create(
                remote_phone=phone,
                remote_name=name,
                status='asignado',
                advisor_id=advisor['id'],
            )

        return Response({'success': True, 'advisor': advisor})


# ---------------------------------------------------------------------------
# 15-16. Origen  GET / PUT  /api/conversacion/<phone>/origen
# ---------------------------------------------------------------------------

class OrigenView(APIView):

    def get(self, request, phone):
        try:
            obj = ConversationOrigen.objects.get(remote_phone=phone)
            return Response({
                'remote_phone': obj.remote_phone,
                'origen': obj.origen,
                'detalle': obj.detalle,
                'detectado_at': obj.detectado_at,
            })
        except ConversationOrigen.DoesNotExist:
            # Fall back to conversations table
            conv_origen = 'directo'
            try:
                conv = Conversation.objects.get(remote_phone=phone)
                conv_origen = conv.origen or 'directo'
            except Conversation.DoesNotExist:
                pass
            return Response({'origen': conv_origen, 'detalle': ''})

    def put(self, request, phone):
        origen = request.data.get('origen', 'directo')
        detalle = request.data.get('detalle', '')

        ConversationOrigen.objects.update_or_create(
            remote_phone=phone,
            defaults={
                'origen': origen,
                'detalle': detalle,
                'detectado_at': timezone.now(),
            },
        )

        # Also update conversations table
        Conversation.objects.filter(remote_phone=phone).update(origen=origen)

        return Response({'success': True})
