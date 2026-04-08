import os
import random
import string
import time
from datetime import date

from django.conf import settings as django_settings
from django.db import connection
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView

from core.export import export_csv
from .models import VentaCerrada


class VentaListCreate(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        data = request.data
        remote_phone = data.get('remote_phone')
        monto = data.get('monto')

        if not remote_phone or not monto:
            return Response({'error': 'Telefono y monto requeridos'}, status=status.HTTP_400_BAD_REQUEST)

        comprobante_url = ''
        if 'comprobante' in request.FILES:
            f = request.FILES['comprobante']
            ext = os.path.splitext(f.name)[1]
            rand = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
            filename = f'comprobante_{int(time.time() * 1000)}_{rand}{ext}'
            upload_dir = django_settings.MEDIA_ROOT
            os.makedirs(upload_dir, exist_ok=True)
            filepath = os.path.join(upload_dir, filename)
            with open(filepath, 'wb+') as dest:
                for chunk in f.chunks():
                    dest.write(chunk)
            comprobante_url = f'/uploads/{filename}'

        remote_name = data.get('remote_name', '')
        advisor_id = data.get('advisor_id') or None
        advisor_nombre = data.get('advisor_nombre', '')
        metodo_pago = data.get('metodo_pago', '')
        productos_descripcion = data.get('productos_descripcion', '')
        notas = data.get('notas', '')
        origen = data.get('origen', '')

        monto_num = float(monto)

        venta = VentaCerrada.objects.create(
            remote_phone=remote_phone,
            remote_name=remote_name,
            advisor_id=int(advisor_id) if advisor_id else None,
            advisor_nombre=advisor_nombre,
            monto=monto_num,
            metodo_pago=metodo_pago,
            productos_descripcion=productos_descripcion,
            comprobante_url=comprobante_url,
            notas=notas,
            origen=origen,
        )

        # Update conversation outcome
        with connection.cursor() as cursor:
            cursor.execute(
                "UPDATE conversations SET outcome = 'venta_cerrada' WHERE remote_phone = %s",
                [remote_phone],
            )

        # Log in chats
        metodo_label = metodo_pago or 'Sin especificar'
        chat_message = f'[Venta cerrada: S/{monto_num:.2f} - {metodo_label}]'
        with connection.cursor() as cursor:
            cursor.execute(
                'INSERT INTO chats (remote_phone, remote_name, message, direction, is_ai_response) '
                'VALUES (%s, %s, %s, %s, %s)',
                [remote_phone, remote_name, chat_message, 'outgoing', 0],
            )

        return Response({'id': venta.id})

    def get(self, request):
        advisor_id = request.query_params.get('advisor_id')
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')

        sql = 'SELECT * FROM ventas_cerradas WHERE 1=1'
        params = []

        if advisor_id:
            sql += ' AND advisor_id = %s'
            params.append(int(advisor_id))
        if fecha_desde:
            sql += ' AND date(created_at) >= %s'
            params.append(fecha_desde)
        if fecha_hasta:
            sql += ' AND date(created_at) <= %s'
            params.append(fecha_hasta)

        sql += ' ORDER BY created_at DESC LIMIT 200'

        with connection.cursor() as cursor:
            cursor.execute(sql, params)
            columns = [col[0] for col in cursor.description]
            rows = [dict(zip(columns, row)) for row in cursor.fetchall()]

        return Response(rows)


class VentaStats(APIView):
    def get(self, request):
        today = date.today().isoformat()

        with connection.cursor() as cursor:
            # Hoy
            cursor.execute(
                "SELECT COUNT(*) as c, COALESCE(SUM(monto),0) as t FROM ventas_cerradas WHERE date(created_at) = %s",
                [today],
            )
            hoy = dict(zip(['c', 't'], cursor.fetchone()))

            # Semana
            cursor.execute(
                "SELECT COUNT(*) as c, COALESCE(SUM(monto),0) as t FROM ventas_cerradas WHERE date(created_at) >= date('now','-7 days')"
            )
            semana = dict(zip(['c', 't'], cursor.fetchone()))

            # Mes
            cursor.execute(
                "SELECT COUNT(*) as c, COALESCE(SUM(monto),0) as t FROM ventas_cerradas WHERE strftime('%%Y-%%m',created_at) = strftime('%%Y-%%m','now')"
            )
            mes = dict(zip(['c', 't'], cursor.fetchone()))

            # Por metodo
            cursor.execute(
                "SELECT metodo_pago, COUNT(*) as c, SUM(monto) as t FROM ventas_cerradas "
                "WHERE date(created_at) >= date('now','-30 days') GROUP BY metodo_pago ORDER BY t DESC"
            )
            por_metodo = [dict(zip(['metodo_pago', 'c', 't'], row)) for row in cursor.fetchall()]

            # Por vendedora
            cursor.execute(
                "SELECT advisor_nombre, COUNT(*) as c, SUM(monto) as t FROM ventas_cerradas "
                "WHERE advisor_nombre != '' AND date(created_at) >= date('now','-30 days') "
                "GROUP BY advisor_nombre ORDER BY t DESC"
            )
            por_vendedora = [dict(zip(['advisor_nombre', 'c', 't'], row)) for row in cursor.fetchall()]

            # Por origen
            cursor.execute(
                "SELECT COALESCE(origen,'directo') as origen, COUNT(*) as c, SUM(monto) as t "
                "FROM ventas_cerradas WHERE date(created_at) >= date('now','-30 days') "
                "GROUP BY origen ORDER BY t DESC"
            )
            por_origen = [dict(zip(['origen', 'c', 't'], row)) for row in cursor.fetchall()]

            # Ultimas
            cursor.execute(
                "SELECT * FROM ventas_cerradas ORDER BY created_at DESC LIMIT 10"
            )
            ultimas_cols = [col[0] for col in cursor.description]
            ultimas = [dict(zip(ultimas_cols, row)) for row in cursor.fetchall()]

            # Chart semanal
            chart_semanal = []
            for i in range(6, -1, -1):
                cursor.execute(
                    "SELECT date('now','-'||%s||' days') as fecha, COUNT(*) as c, "
                    "COALESCE(SUM(monto),0) as t FROM ventas_cerradas "
                    "WHERE date(created_at) = date('now','-'||%s||' days')",
                    [i, i],
                )
                row = cursor.fetchone()
                chart_semanal.append({'fecha': row[0], 'c': row[1], 't': row[2]})

        return Response({
            'hoy': hoy,
            'semana': semana,
            'mes': mes,
            'por_metodo': por_metodo,
            'por_vendedora': por_vendedora,
            'por_origen': por_origen,
            'ultimas': ultimas,
            'chart_semanal': chart_semanal,
        })


class VentaExport(APIView):
    def get(self, request):
        advisor_id = request.query_params.get('advisor_id')
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')

        sql = 'SELECT * FROM ventas_cerradas WHERE 1=1'
        params = []

        if advisor_id:
            sql += ' AND advisor_id = %s'
            params.append(int(advisor_id))
        if fecha_desde:
            sql += ' AND date(created_at) >= %s'
            params.append(fecha_desde)
        if fecha_hasta:
            sql += ' AND date(created_at) <= %s'
            params.append(fecha_hasta)

        sql += ' ORDER BY created_at DESC'

        with connection.cursor() as cursor:
            cursor.execute(sql, params)
            columns = [col[0] for col in cursor.description]
            rows = [list(row) for row in cursor.fetchall()]

        headers = ['ID', 'Telefono', 'Nombre', 'Asesor ID', 'Asesora', 'Monto',
                    'Metodo Pago', 'Productos', 'Comprobante', 'Notas', 'Origen', 'Fecha']

        return export_csv('ventas_cerradas.csv', headers, rows)
