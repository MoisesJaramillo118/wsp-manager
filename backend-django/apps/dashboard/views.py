import logging
from datetime import date

from django.db import connection
from rest_framework.views import APIView
from rest_framework.response import Response

from core.export import export_csv

logger = logging.getLogger(__name__)


def _dictfetchall(cursor):
    """Return all rows from a cursor as a list of dicts."""
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def _dictfetchone(cursor):
    columns = [col[0] for col in cursor.description]
    row = cursor.fetchone()
    return dict(zip(columns, row)) if row else {}


def _fetch_stats():
    """Build the full dashboard stats dict using raw SQL (SQLite)."""
    today = date.today().isoformat()

    with connection.cursor() as c:
        c.execute("SELECT COUNT(DISTINCT remote_phone) FROM chats WHERE date(created_at) >= date('now', '-7 days')")
        chats_activos = c.fetchone()[0] or 0

        c.execute("SELECT COUNT(*) FROM conversations WHERE status = 'sin_responder'")
        sin_responder = c.fetchone()[0] or 0

        c.execute("SELECT COUNT(*) FROM conversations WHERE needs_human = 1 AND status NOT IN ('resuelto','asignado')")
        necesita_asesor = c.fetchone()[0] or 0

        c.execute("SELECT COUNT(*) FROM conversations WHERE status = 'asignado'")
        asignados = c.fetchone()[0] or 0

        c.execute("SELECT COUNT(*) FROM conversations WHERE outcome = 'venta_cerrada'")
        ventas_cerradas = c.fetchone()[0] or 0

        c.execute("SELECT COUNT(*) FROM conversations WHERE outcome = 'venta_cerrada' AND date(last_message_at) = %s", [today])
        ventas_cerradas_hoy = c.fetchone()[0] or 0

        c.execute("SELECT COUNT(*) FROM conversations WHERE outcome = 'venta_perdida'")
        ventas_perdidas = c.fetchone()[0] or 0

        c.execute("SELECT COUNT(*) FROM conversations WHERE outcome = 'venta_perdida' AND date(last_message_at) = %s", [today])
        ventas_perdidas_hoy = c.fetchone()[0] or 0

        c.execute("SELECT COUNT(*) FROM messages WHERE estado = 'enviado' AND date(sent_at) = %s", [today])
        enviados_hoy = c.fetchone()[0] or 0

        c.execute("SELECT COUNT(*) FROM messages WHERE estado = 'programado'")
        programados = c.fetchone()[0] or 0

        c.execute("SELECT COUNT(*) FROM contacts WHERE activo = 1")
        total_contactos = c.fetchone()[0] or 0

        c.execute("SELECT COUNT(*) FROM messages WHERE estado = 'fallido' AND date(created_at) = %s", [today])
        fallidos_hoy = c.fetchone()[0] or 0

        c.execute("SELECT COUNT(DISTINCT remote_phone) FROM chats")
        total_conversaciones = c.fetchone()[0] or 0

        c.execute("SELECT COUNT(*) FROM conversations WHERE status = 'resuelto'")
        resueltos = c.fetchone()[0] or 0

        c.execute("SELECT COUNT(*) FROM conversations WHERE status = 'ia_atendido'")
        ia_atendido = c.fetchone()[0] or 0

        # Chats without a conversation record count as sin_responder
        c.execute("""
            SELECT COUNT(DISTINCT c.remote_phone) FROM chats c
            LEFT JOIN conversations cv ON cv.remote_phone = c.remote_phone
            WHERE cv.id IS NULL
        """)
        sin_registro = c.fetchone()[0] or 0
        sin_responder += sin_registro

        # Ventas cerradas money stats
        c.execute(
            "SELECT COALESCE(SUM(monto),0) FROM ventas_cerradas WHERE date(created_at) = %s",
            [today],
        )
        dinero_hoy = c.fetchone()[0] or 0

        c.execute("SELECT COALESCE(SUM(monto),0) FROM ventas_cerradas WHERE date(created_at) >= date('now','-7 days')")
        dinero_semana = c.fetchone()[0] or 0

        c.execute("SELECT COALESCE(SUM(monto),0) FROM ventas_cerradas WHERE strftime('%%Y-%%m',created_at) = strftime('%%Y-%%m','now')")
        dinero_mes = c.fetchone()[0] or 0

        c.execute(
            "SELECT COUNT(*) FROM ventas_cerradas WHERE date(created_at) = %s",
            [today],
        )
        ventas_registradas_hoy = c.fetchone()[0] or 0

        c.execute("SELECT COUNT(*) FROM ventas_cerradas WHERE strftime('%%Y-%%m',created_at) = strftime('%%Y-%%m','now')")
        ventas_registradas_mes = c.fetchone()[0] or 0

        # Improved stats: global totals and conversion rate
        c.execute("SELECT COUNT(*) FROM ventas_cerradas")
        total_ventas_cerradas = c.fetchone()[0] or 0

        c.execute("SELECT COUNT(DISTINCT remote_phone) FROM chats")
        total_chats_unicos = c.fetchone()[0] or 0

        tasa_conversion_global = (
            round((total_ventas_cerradas / total_chats_unicos) * 100, 2)
            if total_chats_unicos > 0 else 0
        )

    return {
        'chats_activos': chats_activos,
        'sin_responder': sin_responder,
        'necesita_asesor': necesita_asesor,
        'asignados': asignados,
        'ventas_cerradas': ventas_cerradas,
        'ventas_cerradas_hoy': ventas_cerradas_hoy,
        'ventas_perdidas': ventas_perdidas,
        'ventas_perdidas_hoy': ventas_perdidas_hoy,
        'enviados_hoy': enviados_hoy,
        'programados': programados,
        'total_contactos': total_contactos,
        'fallidos_hoy': fallidos_hoy,
        'total_conversaciones': total_conversaciones,
        'resueltos': resueltos,
        'ia_atendido': ia_atendido,
        'dinero_hoy': dinero_hoy,
        'dinero_semana': dinero_semana,
        'dinero_mes': dinero_mes,
        'ventas_registradas_hoy': ventas_registradas_hoy,
        'ventas_registradas_mes': ventas_registradas_mes,
        'total_ventas_cerradas': total_ventas_cerradas,
        'total_chats_unicos': total_chats_unicos,
        'tasa_conversion_global': tasa_conversion_global,
    }


class DashboardStats(APIView):
    def get(self, request):
        stats = _fetch_stats()
        return Response(stats)


class DashboardStatsExport(APIView):
    def get(self, request):
        stats = _fetch_stats()
        headers = ['metric', 'value']
        rows = [[k, v] for k, v in stats.items()]
        return export_csv('dashboard_stats.csv', headers, rows)


class DashboardAlerts(APIView):
    def get(self, request):
        minutes_threshold = int(request.query_params.get('minutes', 20))
        with connection.cursor() as c:
            c.execute("""
                SELECT
                    c1.remote_phone,
                    MAX(c1.remote_name) as remote_name,
                    MAX(c1.created_at) as last_incoming_at,
                    (SELECT message FROM chats c2
                     WHERE c2.remote_phone = c1.remote_phone AND c2.direction = 'incoming'
                     ORDER BY c2.created_at DESC LIMIT 1) as last_message,
                    COALESCE(cv.status, 'sin_responder') as status,
                    cv.advisor_id,
                    a.nombre as advisor_nombre,
                    CAST((julianday('now') - julianday(MAX(c1.created_at))) * 1440 AS INTEGER) as minutes_waiting
                FROM chats c1
                LEFT JOIN conversations cv ON cv.remote_phone = c1.remote_phone
                LEFT JOIN advisors a ON a.id = cv.advisor_id
                WHERE c1.direction = 'incoming'
                  AND c1.created_at = (
                      SELECT MAX(c3.created_at) FROM chats c3
                      WHERE c3.remote_phone = c1.remote_phone
                  )
                  AND CAST((julianday('now') - julianday(c1.created_at)) * 1440 AS INTEGER) >= %s
                  AND COALESCE(cv.status, 'sin_responder') != 'resuelto'
                GROUP BY c1.remote_phone
                ORDER BY minutes_waiting DESC
            """, [minutes_threshold])
            alerts = _dictfetchall(c)
        return Response(alerts)


class AdvisorPerformance(APIView):
    def get(self, request):
        with connection.cursor() as c:
            c.execute("""
                SELECT
                    a.id, a.nombre, a.email, a.color, a.especialidad,
                    a.local_tienda, a.max_chats, a.rol,
                    (SELECT COUNT(*) FROM conversations c
                     WHERE c.advisor_id = a.id AND c.status = 'asignado') as chats_activos,
                    (SELECT COUNT(*) FROM conversations c
                     WHERE c.advisor_id = a.id AND c.outcome = 'venta_cerrada') as ventas_cerradas,
                    (SELECT COUNT(*) FROM conversations c
                     WHERE c.advisor_id = a.id AND c.outcome = 'venta_perdida') as ventas_perdidas,
                    (SELECT COUNT(*) FROM conversations c
                     WHERE c.advisor_id = a.id AND c.status = 'resuelto') as resueltos,
                    (SELECT COUNT(*) FROM conversations c
                     WHERE c.advisor_id = a.id) as total_atendidos,
                    (SELECT AVG(c.first_response_seconds) FROM conversations c
                     WHERE c.advisor_id = a.id
                       AND c.first_response_seconds IS NOT NULL) as avg_response_seconds
                FROM advisors a
                WHERE a.activo = 1
                ORDER BY ventas_cerradas DESC, total_atendidos DESC
            """)
            advisors = _dictfetchall(c)
        return Response(advisors)


class ConversionDiariaView(APIView):
    def get(self, request):
        with connection.cursor() as c:
            c.execute("""
                SELECT
                    date(c.created_at) as fecha,
                    COUNT(DISTINCT c.remote_phone) as chats_nuevos,
                    (SELECT COUNT(*) FROM ventas_cerradas v WHERE date(v.created_at) = date(c.created_at)) as ventas
                FROM chats c
                WHERE c.direction = 'incoming'
                  AND c.created_at >= date('now', '-30 days')
                GROUP BY date(c.created_at)
                ORDER BY fecha DESC
            """)
            cols = [d[0] for d in c.description]
            results = [dict(zip(cols, row)) for row in c.fetchall()]

        # Add conversion rate
        for r in results:
            chats = r['chats_nuevos']
            ventas = r['ventas']
            r['tasa'] = round((ventas / chats) * 100, 2) if chats > 0 else 0

        return Response(results)


class WeeklyChart(APIView):
    def get(self, request):
        data = []
        with connection.cursor() as c:
            for i in range(6, -1, -1):
                c.execute("""
                    SELECT
                        date('now', '-' || %s || ' days') as fecha,
                        (SELECT COUNT(*) FROM messages
                         WHERE estado = 'enviado'
                           AND date(sent_at) = date('now', '-' || %s || ' days')) as enviados,
                        (SELECT COUNT(*) FROM conversations
                         WHERE outcome = 'venta_cerrada'
                           AND date(last_message_at) = date('now', '-' || %s || ' days')) as ventas,
                        (SELECT COUNT(DISTINCT remote_phone) FROM chats
                         WHERE direction = 'incoming'
                           AND date(created_at) = date('now', '-' || %s || ' days')) as chats_entrantes
                """, [i, i, i, i])
                row = _dictfetchone(c)
                data.append(row)
        return Response(data)
