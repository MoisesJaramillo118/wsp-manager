from django.db import connection
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView


class ReminderList(APIView):
    def get(self, request):
        advisor_id = request.query_params.get('advisor_id')
        reminder_status = request.query_params.get('status')

        sql = ('SELECT r.*, cv.remote_name FROM reminders r '
               'LEFT JOIN conversations cv ON cv.remote_phone = r.remote_phone WHERE 1=1')
        params = []

        if advisor_id:
            sql += ' AND r.advisor_id = %s'
            params.append(int(advisor_id))
        if reminder_status:
            sql += ' AND r.status = %s'
            params.append(reminder_status)
        else:
            sql += " AND r.status = 'pending'"

        sql += ' ORDER BY r.remind_at ASC'

        with connection.cursor() as cursor:
            cursor.execute(sql, params)
            columns = [col[0] for col in cursor.description]
            rows = [dict(zip(columns, row)) for row in cursor.fetchall()]

        return Response(rows)

    def post(self, request):
        data = request.data
        remote_phone = data.get('remote_phone')
        note = data.get('note')
        remind_at = data.get('remind_at')

        if not remote_phone or not note or not remind_at:
            return Response(
                {'error': 'Campos requeridos: remote_phone, note, remind_at'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        advisor_id = data.get('advisor_id') or None

        with connection.cursor() as cursor:
            cursor.execute(
                'INSERT INTO reminders (remote_phone, advisor_id, note, remind_at) VALUES (%s, %s, %s, %s)',
                [remote_phone, advisor_id, note, remind_at],
            )
            reminder_id = cursor.lastrowid

        return Response({'id': reminder_id})


class ReminderDue(APIView):
    def get(self, request):
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT r.*, cv.remote_name FROM reminders r "
                "LEFT JOIN conversations cv ON cv.remote_phone = r.remote_phone "
                "WHERE r.status = 'pending' AND r.remind_at <= datetime('now') "
                "ORDER BY r.remind_at ASC"
            )
            columns = [col[0] for col in cursor.description]
            rows = [dict(zip(columns, row)) for row in cursor.fetchall()]

        return Response(rows)


class ReminderDetail(APIView):
    def put(self, request, pk):
        reminder_status = request.data.get('status')
        if reminder_status not in ('pending', 'done', 'dismissed'):
            return Response({'error': 'Estado no valido'}, status=status.HTTP_400_BAD_REQUEST)

        with connection.cursor() as cursor:
            cursor.execute(
                'UPDATE reminders SET status = %s WHERE id = %s',
                [reminder_status, pk],
            )

        return Response({'success': True})

    def delete(self, request, pk):
        with connection.cursor() as cursor:
            cursor.execute('DELETE FROM reminders WHERE id = %s', [pk])

        return Response({'success': True})
