import json
import os
import random
import string
import time
from datetime import date
from decimal import Decimal

from django.conf import settings as django_settings
from django.db import connection, transaction
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.views import APIView

from core.export import export_csv
from .models import VentaCerrada, VentaItem


class VentaListCreate(APIView):
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        data = request.data
        remote_phone = data.get('remote_phone')

        if not remote_phone:
            return Response({'error': 'Telefono requerido'}, status=status.HTTP_400_BAD_REQUEST)

        # Parse items (JSON array). When multipart, items arrive as a JSON string.
        raw_items = data.get('items')
        items_list = []
        if raw_items:
            if isinstance(raw_items, str):
                try:
                    items_list = json.loads(raw_items)
                except json.JSONDecodeError:
                    return Response(
                        {'error': 'Formato de items invalido'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            elif isinstance(raw_items, list):
                items_list = raw_items

        # Normalize and filter out blank rows
        normalized_items = []
        for it in items_list:
            if not isinstance(it, dict):
                continue
            descripcion = str(it.get('descripcion', '')).strip()
            try:
                cantidad = int(it.get('cantidad') or 0)
            except (TypeError, ValueError):
                cantidad = 0
            try:
                precio_unitario = Decimal(str(it.get('precio_unitario') or '0'))
            except Exception:
                precio_unitario = Decimal('0')
            if not descripcion or cantidad <= 0:
                continue
            subtotal = (Decimal(cantidad) * precio_unitario).quantize(Decimal('0.01'))
            normalized_items.append({
                'descripcion': descripcion,
                'cantidad': cantidad,
                'precio_unitario': precio_unitario,
                'subtotal': subtotal,
            })

        # Compute monto: if items are present, recalculate; otherwise fall back to provided monto
        if normalized_items:
            monto_num = float(sum((it['subtotal'] for it in normalized_items), Decimal('0')))
        else:
            monto_raw = data.get('monto')
            if not monto_raw:
                return Response(
                    {'error': 'Monto o items requeridos'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            try:
                monto_num = float(monto_raw)
            except (TypeError, ValueError):
                return Response({'error': 'Monto invalido'}, status=status.HTTP_400_BAD_REQUEST)

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

        with transaction.atomic():
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

            created_items = []
            for it in normalized_items:
                vi = VentaItem.objects.create(
                    venta=venta,
                    descripcion=it['descripcion'],
                    cantidad=it['cantidad'],
                    precio_unitario=it['precio_unitario'],
                    subtotal=it['subtotal'],
                )
                created_items.append({
                    'id': vi.id,
                    'descripcion': vi.descripcion,
                    'cantidad': vi.cantidad,
                    'precio_unitario': float(vi.precio_unitario),
                    'subtotal': float(vi.subtotal),
                })

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

        return Response({
            'id': venta.id,
            'remote_phone': venta.remote_phone,
            'remote_name': venta.remote_name,
            'advisor_id': venta.advisor_id,
            'advisor_nombre': venta.advisor_nombre,
            'monto': float(venta.monto),
            'metodo_pago': venta.metodo_pago,
            'productos_descripcion': venta.productos_descripcion,
            'comprobante_url': venta.comprobante_url,
            'notas': venta.notas,
            'origen': venta.origen,
            'created_at': venta.created_at.isoformat() if venta.created_at else None,
            'items': created_items,
        })

    def get(self, request):
        advisor_id = request.query_params.get('advisor_id')
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')

        qs = VentaCerrada.objects.all().prefetch_related('items')

        if advisor_id:
            qs = qs.filter(advisor_id=int(advisor_id))
        if fecha_desde:
            qs = qs.extra(where=['date(created_at) >= %s'], params=[fecha_desde])
        if fecha_hasta:
            qs = qs.extra(where=['date(created_at) <= %s'], params=[fecha_hasta])

        qs = qs.order_by('-created_at')[:200]

        result = []
        for venta in qs:
            result.append({
                'id': venta.id,
                'remote_phone': venta.remote_phone,
                'remote_name': venta.remote_name,
                'advisor_id': venta.advisor_id,
                'advisor_nombre': venta.advisor_nombre,
                'monto': float(venta.monto),
                'metodo_pago': venta.metodo_pago,
                'productos_descripcion': venta.productos_descripcion,
                'comprobante_url': venta.comprobante_url,
                'notas': venta.notas,
                'origen': venta.origen,
                'created_at': venta.created_at.isoformat() if venta.created_at else None,
                'items': [
                    {
                        'id': it.id,
                        'descripcion': it.descripcion,
                        'cantidad': it.cantidad,
                        'precio_unitario': float(it.precio_unitario),
                        'subtotal': float(it.subtotal),
                    }
                    for it in venta.items.all()
                ],
            })

        return Response(result)


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

            # Top productos
            top_productos = []
            try:
                cursor.execute(
                    "SELECT descripcion, SUM(cantidad) as total_vendido, "
                    "SUM(subtotal) as total_revenue FROM venta_items "
                    "GROUP BY descripcion ORDER BY total_revenue DESC LIMIT 10"
                )
                top_productos = [
                    {
                        'descripcion': row[0],
                        'total_vendido': row[1],
                        'total_revenue': float(row[2]) if row[2] is not None else 0.0,
                    }
                    for row in cursor.fetchall()
                ]
            except Exception:
                top_productos = []

        return Response({
            'hoy': hoy,
            'semana': semana,
            'mes': mes,
            'por_metodo': por_metodo,
            'por_vendedora': por_vendedora,
            'por_origen': por_origen,
            'ultimas': ultimas,
            'chart_semanal': chart_semanal,
            'top_productos': top_productos,
        })


class VentasPorAsesorView(APIView):
    """
    Detailed sales metrics per advisor for admin dashboard.
    GET /api/ventas-cerradas/por-asesor
    Query params: fecha_desde, fecha_hasta (optional ISO dates)
    """
    def get(self, request):
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')

        # Build date filter for ventas (used in the rango sub-selects)
        date_filter = ""
        range_params = []
        if fecha_desde and fecha_hasta:
            date_filter = " AND date(v.created_at) BETWEEN %s AND %s"
            range_params = [fecha_desde, fecha_hasta]
        elif fecha_desde:
            date_filter = " AND date(v.created_at) >= %s"
            range_params = [fecha_desde]
        elif fecha_hasta:
            date_filter = " AND date(v.created_at) <= %s"
            range_params = [fecha_hasta]

        sql = f"""
            SELECT
                a.id, a.nombre, a.color, a.especialidad, a.local_tienda, a.en_turno,
                (SELECT COUNT(*) FROM ventas_cerradas v WHERE v.advisor_id = a.id) as total_ventas,
                (SELECT COALESCE(SUM(monto), 0) FROM ventas_cerradas v WHERE v.advisor_id = a.id) as total_monto,
                (SELECT COUNT(*) FROM ventas_cerradas v WHERE v.advisor_id = a.id AND date(v.created_at) = date('now')) as ventas_hoy,
                (SELECT COALESCE(SUM(monto), 0) FROM ventas_cerradas v WHERE v.advisor_id = a.id AND date(v.created_at) = date('now')) as monto_hoy,
                (SELECT COUNT(*) FROM ventas_cerradas v WHERE v.advisor_id = a.id AND date(v.created_at) >= date('now','-7 days')) as ventas_semana,
                (SELECT COALESCE(SUM(monto), 0) FROM ventas_cerradas v WHERE v.advisor_id = a.id AND date(v.created_at) >= date('now','-7 days')) as monto_semana,
                (SELECT COUNT(*) FROM ventas_cerradas v WHERE v.advisor_id = a.id AND strftime('%%Y-%%m', v.created_at) = strftime('%%Y-%%m','now')) as ventas_mes,
                (SELECT COALESCE(SUM(monto), 0) FROM ventas_cerradas v WHERE v.advisor_id = a.id AND strftime('%%Y-%%m', v.created_at) = strftime('%%Y-%%m','now')) as monto_mes,
                (SELECT COUNT(*) FROM ventas_cerradas v WHERE v.advisor_id = a.id{date_filter}) as ventas_rango,
                (SELECT COALESCE(SUM(monto), 0) FROM ventas_cerradas v WHERE v.advisor_id = a.id{date_filter}) as monto_rango,
                (SELECT COUNT(*) FROM conversations c WHERE c.advisor_id = a.id) as total_chats_atendidos,
                (SELECT COUNT(*) FROM conversations c WHERE c.advisor_id = a.id AND c.status = 'asignado') as chats_activos,
                (SELECT COALESCE(AVG(monto), 0) FROM ventas_cerradas v WHERE v.advisor_id = a.id) as ticket_promedio
            FROM advisors a
            WHERE a.activo = 1
            ORDER BY total_monto DESC
        """

        # The date_filter is used in two sub-selects (ventas_rango and monto_rango)
        params = list(range_params) + list(range_params)

        with connection.cursor() as c:
            c.execute(sql, params)
            cols = [d[0] for d in c.description]
            rows = [dict(zip(cols, row)) for row in c.fetchall()]

        # Calculate conversion rate and cast decimals to float for JSON serialization
        for r in rows:
            chats = r['total_chats_atendidos'] or 0
            ventas = r['total_ventas'] or 0
            r['tasa_conversion'] = round((ventas / chats) * 100, 2) if chats > 0 else 0
            for field in ['total_monto', 'monto_hoy', 'monto_semana', 'monto_mes', 'monto_rango', 'ticket_promedio']:
                r[field] = float(r[field] or 0)
            r['en_turno'] = bool(r['en_turno'])

        total_ventas = sum(r['total_ventas'] for r in rows)
        total_monto = sum(r['total_monto'] for r in rows)
        total_chats_atendidos = sum(r['total_chats_atendidos'] for r in rows)

        return Response({
            'asesores': rows,
            'totales': {
                'total_ventas': total_ventas,
                'total_monto': round(total_monto, 2),
                'total_chats_atendidos': total_chats_atendidos,
                'tasa_conversion_global': round((total_ventas / total_chats_atendidos) * 100, 2) if total_chats_atendidos > 0 else 0,
                'ticket_promedio_global': round(total_monto / total_ventas, 2) if total_ventas > 0 else 0,
            }
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
