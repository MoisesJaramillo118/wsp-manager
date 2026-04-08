import csv
import io
import re

from django.db import IntegrityError
from django.db.models import Count, Q
from django.http import StreamingHttpResponse
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.tags.models import ContactTag, Tag
from apps.tags.serializers import TagSerializer

from .models import Contact, ContactGroup
from .serializers import ContactGroupSerializer, ContactMinimalSerializer, ContactSerializer


def clean_phone(phone):
    """Remove spaces, dashes, and parentheses from phone number."""
    if not phone:
        return phone
    return re.sub(r'[\s\-()]', '', phone)


# ---------------------------------------------------------------------------
# Groups
# ---------------------------------------------------------------------------

class GroupListCreate(APIView):
    def get(self, request):
        groups = ContactGroup.objects.annotate(
            total_contacts=Count('contacts', filter=Q(contacts__activo=True))
        )
        serializer = ContactGroupSerializer(groups, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = ContactGroupSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class GroupDetail(APIView):
    def put(self, request, pk):
        try:
            group = ContactGroup.objects.get(pk=pk)
        except ContactGroup.DoesNotExist:
            return Response({'error': 'Grupo no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        serializer = ContactGroupSerializer(group, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        try:
            group = ContactGroup.objects.get(pk=pk)
        except ContactGroup.DoesNotExist:
            return Response({'error': 'Grupo no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        # Set contacts grupo=null, then delete group
        Contact.objects.filter(grupo=group).update(grupo=None)
        group.delete()
        return Response({'message': 'Grupo eliminado'})


# ---------------------------------------------------------------------------
# Contacts
# ---------------------------------------------------------------------------

class ContactList(APIView):
    def get(self, request):
        search = request.query_params.get('search', '').strip()
        grupo_id = request.query_params.get('grupo_id', None)
        page = int(request.query_params.get('page', 1))
        limit = int(request.query_params.get('limit', 50))

        qs = Contact.objects.filter(activo=True).select_related('grupo')

        if search:
            qs = qs.filter(Q(nombre__icontains=search) | Q(telefono__icontains=search))

        if grupo_id:
            qs = qs.filter(grupo_id=grupo_id)

        total = qs.count()
        offset = (page - 1) * limit
        contacts = qs[offset:offset + limit]

        serializer = ContactSerializer(contacts, many=True)
        return Response({
            'contacts': serializer.data,
            'total': total,
            'page': page,
            'limit': limit,
        })

    def post(self, request):
        data = request.data.copy()
        if 'telefono' in data:
            data['telefono'] = clean_phone(data['telefono'])

        serializer = ContactSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ContactAll(APIView):
    """Return all active contacts (minimal fields) for the Send page."""

    def get(self, request):
        contacts = Contact.objects.filter(activo=True).only('id', 'nombre', 'telefono', 'grupo')
        serializer = ContactMinimalSerializer(contacts, many=True)
        return Response(serializer.data)


class ContactDetail(APIView):
    def put(self, request, pk):
        try:
            contact = Contact.objects.get(pk=pk)
        except Contact.DoesNotExist:
            return Response({'error': 'Contacto no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data.copy()
        if 'telefono' in data:
            data['telefono'] = clean_phone(data['telefono'])

        serializer = ContactSerializer(contact, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        try:
            contact = Contact.objects.get(pk=pk)
        except Contact.DoesNotExist:
            return Response({'error': 'Contacto no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        # Soft delete
        contact.activo = False
        contact.save(update_fields=['activo'])
        return Response({'message': 'Contacto eliminado'})


class ContactImport(APIView):
    def post(self, request):
        contacts_data = request.data.get('contacts', [])
        grupo_id = request.data.get('grupo_id', None)

        imported = 0
        skipped = 0

        for item in contacts_data:
            nombre = (item.get('nombre') or '').strip()
            telefono = clean_phone(item.get('telefono', ''))
            if not telefono:
                skipped += 1
                continue

            try:
                Contact.objects.create(
                    nombre=nombre,
                    telefono=telefono,
                    grupo_id=grupo_id,
                )
                imported += 1
            except IntegrityError:
                # INSERT OR IGNORE logic: skip duplicates
                skipped += 1

        return Response({
            'message': f'{imported} contactos importados, {skipped} omitidos',
            'imported': imported,
            'skipped': skipped,
        })


class ContactExport(APIView):
    """Export contacts as CSV using StreamingHttpResponse."""

    def get(self, request):
        contacts = Contact.objects.filter(activo=True).select_related('grupo').order_by('nombre')

        def csv_rows():
            buffer = io.StringIO()
            writer = csv.writer(buffer)

            # Header
            writer.writerow(['ID', 'Nombre', 'Telefono', 'Grupo', 'Notas', 'Fecha Creacion'])
            yield buffer.getvalue()
            buffer.seek(0)
            buffer.truncate(0)

            # Data rows
            for contact in contacts.iterator():
                writer.writerow([
                    contact.id,
                    contact.nombre,
                    contact.telefono,
                    contact.grupo.nombre if contact.grupo else '',
                    contact.notas,
                    contact.created_at.strftime('%Y-%m-%d %H:%M:%S') if contact.created_at else '',
                ])
                yield buffer.getvalue()
                buffer.seek(0)
                buffer.truncate(0)

        response = StreamingHttpResponse(csv_rows(), content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="contacts.csv"'
        return response


# ---------------------------------------------------------------------------
# Contact Tags
# ---------------------------------------------------------------------------

class ContactTagList(APIView):
    def get(self, request, pk):
        tag_ids = ContactTag.objects.filter(contact_id=pk).values_list('tag_id', flat=True)
        tags = Tag.objects.filter(id__in=tag_ids)
        serializer = TagSerializer(tags, many=True)
        return Response(serializer.data)

    def post(self, request, pk):
        tag_id = request.data.get('tag_id')
        if not tag_id:
            return Response({'error': 'tag_id es requerido'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            ContactTag.objects.create(contact_id=pk, tag_id=tag_id)
        except IntegrityError:
            return Response({'error': 'Tag ya asignado'}, status=status.HTTP_409_CONFLICT)

        return Response({'message': 'Tag asignado'}, status=status.HTTP_201_CREATED)


class ContactTagRemove(APIView):
    def delete(self, request, pk, tag_id):
        deleted, _ = ContactTag.objects.filter(contact_id=pk, tag_id=tag_id).delete()
        if deleted == 0:
            return Response({'error': 'Tag no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'message': 'Tag removido'})
