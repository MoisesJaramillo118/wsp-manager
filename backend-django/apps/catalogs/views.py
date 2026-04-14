import os
import time
import uuid

from django.conf import settings
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.connection.evolution import send_document, EvolutionAPIError
from apps.contacts.models import Contact
from core.public_urls import build_upload_url

from .models import Catalog
from .serializers import CatalogSerializer


# ---------------------------------------------------------------------------
# List / Create Catalogs
# ---------------------------------------------------------------------------

class CatalogListCreate(APIView):
    def get(self, request):
        qs = Catalog.objects.filter(activo=True)
        serializer = CatalogSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        pdf_file = request.FILES.get('pdf') or request.FILES.get('file')
        if not pdf_file:
            return Response({'error': 'Se requiere un archivo PDF'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate PDF content type
        if pdf_file.content_type != 'application/pdf':
            return Response({'error': 'Solo se permiten archivos PDF'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate max size (60MB)
        max_size = 60 * 1024 * 1024
        if pdf_file.size > max_size:
            return Response({'error': 'El archivo excede el limite de 60MB'}, status=status.HTTP_400_BAD_REQUEST)

        # Generate unique filename
        unique_name = f"catalog_{int(time.time())}_{uuid.uuid4().hex[:6]}.pdf"
        uploads_dir = settings.MEDIA_ROOT
        os.makedirs(uploads_dir, exist_ok=True)
        filepath = os.path.join(uploads_dir, unique_name)

        # Save file to disk
        with open(filepath, 'wb') as dest:
            for chunk in pdf_file.chunks():
                dest.write(chunk)

        # Create catalog record
        nombre = request.data.get('nombre', pdf_file.name)
        categoria = request.data.get('categoria', 'general')
        descripcion = request.data.get('descripcion', '')
        keywords = request.data.get('keywords', '')

        catalog = Catalog.objects.create(
            nombre=nombre,
            categoria=categoria,
            descripcion=descripcion,
            keywords=keywords,
            filename=unique_name,
            filepath=filepath,
            filesize=pdf_file.size,
        )

        serializer = CatalogSerializer(catalog)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# Detail (Update / Delete)
# ---------------------------------------------------------------------------

class CatalogDetail(APIView):
    def put(self, request, pk):
        try:
            catalog = Catalog.objects.get(pk=pk)
        except Catalog.DoesNotExist:
            return Response({'error': 'Catalogo no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        # Only update metadata fields
        catalog.nombre = request.data.get('nombre', catalog.nombre)
        catalog.categoria = request.data.get('categoria', catalog.categoria)
        catalog.descripcion = request.data.get('descripcion', catalog.descripcion)
        catalog.keywords = request.data.get('keywords', catalog.keywords)
        catalog.save(update_fields=['nombre', 'categoria', 'descripcion', 'keywords'])

        serializer = CatalogSerializer(catalog)
        return Response(serializer.data)

    def delete(self, request, pk):
        try:
            catalog = Catalog.objects.get(pk=pk)
        except Catalog.DoesNotExist:
            return Response({'error': 'Catalogo no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        # Delete file from disk
        if catalog.filepath and os.path.isfile(catalog.filepath):
            try:
                os.remove(catalog.filepath)
            except OSError:
                pass

        catalog.delete()
        return Response({'success': True, 'message': 'Catalogo eliminado'})


# ---------------------------------------------------------------------------
# Send Catalog via WhatsApp
# ---------------------------------------------------------------------------

class CatalogSend(APIView):
    def post(self, request, pk):
        try:
            catalog = Catalog.objects.get(pk=pk)
        except Catalog.DoesNotExist:
            return Response({'error': 'Catalogo no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        phone = request.data.get('phone', '')
        contact_id = request.data.get('contact_id')

        # Resolve phone from contact if needed
        if contact_id and not phone:
            try:
                contact = Contact.objects.get(pk=contact_id)
                phone = contact.telefono
            except Contact.DoesNotExist:
                return Response({'error': 'Contacto no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        if not phone:
            return Response({'error': 'Se requiere phone o contact_id'}, status=status.HTTP_400_BAD_REQUEST)

        # Build the public file URL
        file_url = build_upload_url(catalog.filename)
        if not file_url:
            # Fallback: construct from request
            file_url = request.build_absolute_uri(f"{settings.MEDIA_URL}{catalog.filename}")

        try:
            send_document(phone, file_url, catalog.nombre + '.pdf')
        except EvolutionAPIError as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Increment download counter
        catalog.downloads += 1
        catalog.save(update_fields=['downloads'])

        return Response({'success': True, 'message': 'Catalogo enviado'})
