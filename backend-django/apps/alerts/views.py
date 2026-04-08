from django.db import connection
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AlertasConfig


class AlertaConfigView(APIView):
    def get(self, request):
        try:
            config = AlertasConfig.objects.get(id=1)
            return Response({
                'id': config.id,
                'minutos_sin_responder': config.minutos_sin_responder,
                'activo': config.activo,
                'notificar_admin': config.notificar_admin,
                'updated_at': config.updated_at,
            })
        except AlertasConfig.DoesNotExist:
            return Response({'minutos_sin_responder': 15, 'activo': True})

    def put(self, request):
        try:
            config = AlertasConfig.objects.get(id=1)
        except AlertasConfig.DoesNotExist:
            config = AlertasConfig(id=1)

        body = request.data
        if 'minutos_sin_responder' in body:
            config.minutos_sin_responder = int(body['minutos_sin_responder'])
        if 'activo' in body:
            config.activo = bool(body['activo'])
        if 'notificar_admin' in body:
            config.notificar_admin = bool(body['notificar_admin'])

        config.save()
        return Response({'success': True})


class SinResponderView(APIView):
    def get(self, request):
        # Get config
        with connection.cursor() as cursor:
            cursor.execute('SELECT * FROM alertas_config WHERE id = 1')
            row = cursor.fetchone()
            if not row:
                return Response({'alertas': [], 'config': {'minutos_sin_responder': 15, 'activo': True}, 'total': 0})
            config_cols = [col[0] for col in cursor.description]
            config = dict(zip(config_cols, row))

        if not config.get('activo'):
            return Response({'alertas': [], 'config': config, 'total': 0})

        minutos = config.get('minutos_sin_responder', 15)

        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT c1.remote_phone, MAX(c1.remote_name) as remote_name,
                    MAX(c1.created_at) as last_incoming_at,
                    (SELECT message FROM chats c2 WHERE c2.remote_phone = c1.remote_phone AND c2.direction = 'incoming' ORDER BY c2.created_at DESC LIMIT 1) as last_message,
                    COALESCE(cv.status, 'sin_responder') as status,
                    cv.advisor_id, a.nombre as advisor_nombre,
                    COALESCE(cv.origen, co.origen, 'directo') as origen,
                    CAST((julianday('now') - julianday(MAX(c1.created_at))) * 1440 AS INTEGER) as minutes_waiting
                FROM chats c1
                LEFT JOIN conversations cv ON cv.remote_phone = c1.remote_phone
                LEFT JOIN advisors a ON a.id = cv.advisor_id
                LEFT JOIN conversation_origen co ON co.remote_phone = c1.remote_phone
                WHERE c1.direction = 'incoming'
                    AND c1.created_at = (SELECT MAX(c3.created_at) FROM chats c3 WHERE c3.remote_phone = c1.remote_phone)
                    AND CAST((julianday('now') - julianday(c1.created_at)) * 1440 AS INTEGER) >= %s
                    AND COALESCE(cv.status, 'sin_responder') NOT IN ('resuelto')
                GROUP BY c1.remote_phone
                ORDER BY minutes_waiting DESC
            """, [minutos])

            columns = [col[0] for col in cursor.description]
            alertas = [dict(zip(columns, row)) for row in cursor.fetchall()]

        return Response({'alertas': alertas, 'config': config, 'total': len(alertas)})
