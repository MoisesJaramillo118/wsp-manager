from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from . import evolution


# POST /api/connection/create
@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def create_instance_view(request):
    try:
        result = evolution.create_instance(settings.WEBHOOK_URL or None)
        return Response(result)
    except evolution.EvolutionAPIError as e:
        # If instance already exists, that's OK - frontend will request QR next
        if 'already in use' in str(e).lower():
            return Response({'instance': {'instanceName': settings.INSTANCE_NAME, 'status': 'created'}})
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# POST /api/connection/create-with-code
@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def create_with_code_view(request):
    phone_number = request.data.get('phoneNumber')
    if not phone_number:
        return Response({'error': 'phoneNumber es requerido'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        # First try to delete existing instance
        try:
            evolution.delete_instance()
        except Exception:
            pass
        result = evolution.create_instance_with_code(phone_number, settings.WEBHOOK_URL or None)
        return Response(result)
    except evolution.EvolutionAPIError as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# GET /api/connection/status
@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def connection_status_view(request):
    try:
        result = evolution.get_connection_state()
        return Response(result)
    except Exception:
        return Response({'instance': {'state': 'close'}})


# GET /api/connection/qr
@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def qr_code_view(request):
    try:
        result = evolution.get_qr_code()
        return Response(result)
    except evolution.EvolutionAPIError as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# GET /api/connection/instances
@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def list_instances_view(request):
    try:
        result = evolution.fetch_instances()
        return Response(result)
    except evolution.EvolutionAPIError as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# POST /api/connection/logout
@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def logout_view(request):
    try:
        evolution.logout()
        return Response({'success': True})
    except evolution.EvolutionAPIError as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# POST /api/connection/restart
@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def restart_view(request):
    try:
        evolution.restart_instance()
        return Response({'success': True})
    except evolution.EvolutionAPIError as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# DELETE /api/connection/delete
@api_view(['DELETE'])
@authentication_classes([])
@permission_classes([AllowAny])
def delete_instance_view(request):
    try:
        evolution.delete_instance()
        return Response({'success': True})
    except evolution.EvolutionAPIError as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
