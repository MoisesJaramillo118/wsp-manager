import bcrypt
import jwt
from datetime import datetime, timedelta

from django.conf import settings
from django.db import IntegrityError
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .authentication import JWTAuthentication
from .models import Advisor
from .serializers import AdvisorSerializer, AdvisorCreateSerializer, LoginSerializer


def _hash_password(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def _verify_password(password, hashed):
    if not hashed:
        return password == ''
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))


def _generate_token(advisor):
    payload = {
        'id': advisor.id,
        'nombre': advisor.nombre,
        'rol': advisor.rol,
        'exp': datetime.utcnow() + timedelta(hours=settings.JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm='HS256')


def _user_dict(advisor):
    return {
        'id': advisor.id,
        'nombre': advisor.nombre,
        'email': advisor.email,
        'rol': advisor.rol,
        'color': advisor.color,
        'especialidad': advisor.especialidad,
        'local_tienda': advisor.local_tienda,
        'en_turno': advisor.en_turno,
        'ultimo_check_in': advisor.ultimo_check_in.isoformat() if advisor.ultimo_check_in else None,
        'ultimo_check_out': advisor.ultimo_check_out.isoformat() if advisor.ultimo_check_out else None,
    }


# POST /api/auth/login
@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def login_view(request):
    email = request.data.get('email')
    password = request.data.get('password')
    if not email or password is None:
        return Response({'error': 'Email y password requeridos'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        user = Advisor.objects.get(email=email, activo=True)
    except Advisor.DoesNotExist:
        return Response({'error': 'Usuario no encontrado'}, status=status.HTTP_401_UNAUTHORIZED)
    if not _verify_password(password, user.password_hash):
        return Response({'error': 'Contraseña incorrecta'}, status=status.HTTP_401_UNAUTHORIZED)
    token = _generate_token(user)
    return Response({'token': token, 'user': _user_dict(user)})


# GET /api/auth/profiles
@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def profiles_view(request):
    advisors = Advisor.objects.filter(activo=True).order_by('rol', 'nombre')
    profiles = []
    for a in advisors:
        profiles.append({
            'id': a.id,
            'nombre': a.nombre,
            'email': a.email,
            'color': a.color,
            'especialidad': a.especialidad,
            'local_tienda': a.local_tienda,
            'rol': a.rol,
            'has_password': 1 if a.password_hash else 0,
        })
    return Response(profiles)


# GET /api/auth/me
@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def me_view(request):
    try:
        user = Advisor.objects.get(id=request.advisor.id)
    except Advisor.DoesNotExist:
        return Response({'error': 'Usuario no encontrado'}, status=status.HTTP_404_NOT_FOUND)
    return Response(_user_dict(user))


# PUT /api/auth/password
@api_view(['PUT'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def change_password_view(request):
    current_password = request.data.get('current_password', '')
    new_password = request.data.get('new_password', '')
    if not new_password or len(new_password) < 4:
        return Response({'error': 'Contraseña minimo 4 caracteres'}, status=status.HTTP_400_BAD_REQUEST)
    user = Advisor.objects.get(id=request.advisor.id)
    if user.password_hash and not _verify_password(current_password, user.password_hash):
        return Response({'error': 'Contraseña actual incorrecta'}, status=status.HTTP_401_UNAUTHORIZED)
    user.password_hash = _hash_password(new_password)
    user.save(update_fields=['password_hash'])
    return Response({'success': True})


# POST /api/auth/users  (admin only)
@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def create_user_view(request):
    if request.advisor.rol != 'admin':
        return Response({'error': 'Acceso denegado'}, status=status.HTTP_403_FORBIDDEN)
    nombre = request.data.get('nombre')
    email = request.data.get('email')
    if not nombre or not email:
        return Response({'error': 'Nombre y email requeridos'}, status=status.HTTP_400_BAD_REQUEST)
    password = request.data.get('password', '')
    password_hash = _hash_password(password) if password else ''
    try:
        advisor = Advisor.objects.create(
            nombre=nombre,
            email=email,
            password_hash=password_hash,
            rol=request.data.get('rol', 'asesor'),
            color=request.data.get('color', '#ec4899'),
            especialidad=request.data.get('especialidad', ''),
            local_tienda=request.data.get('local_tienda', ''),
            max_chats=request.data.get('max_chats', 10),
        )
        return Response({'id': advisor.id})
    except IntegrityError:
        return Response({'error': 'Email ya registrado'}, status=status.HTTP_400_BAD_REQUEST)


# PUT /api/auth/users/:id/password  (admin only)
@api_view(['PUT'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def reset_user_password_view(request, user_id):
    if request.advisor.rol != 'admin':
        return Response({'error': 'Acceso denegado'}, status=status.HTTP_403_FORBIDDEN)
    new_password = request.data.get('new_password')
    if not new_password:
        return Response({'error': 'Password requerido'}, status=status.HTTP_400_BAD_REQUEST)
    Advisor.objects.filter(id=user_id).update(password_hash=_hash_password(new_password))
    return Response({'success': True})


# GET /api/auth/profile/:id  (legacy)
@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def profile_by_id_view(request, user_id):
    try:
        user = Advisor.objects.get(id=user_id, activo=True)
    except Advisor.DoesNotExist:
        return Response({'error': 'Perfil no encontrado'}, status=status.HTTP_404_NOT_FOUND)
    return Response(_user_dict(user))


# GET /api/advisors
@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def advisors_list_view(request):
    from django.db.models import Count, Q
    advisors = Advisor.objects.filter(activo=True).annotate(
        chats_asignados=Count(
            'conversation',
            filter=Q(conversation__status='asignado')
        )
    ).order_by('nombre')
    data = []
    for a in advisors:
        d = _user_dict(a)
        d['max_chats'] = a.max_chats
        d['activo'] = a.activo
        d['chats_asignados'] = a.chats_asignados
        data.append(d)
    return Response(data)


# PUT/DELETE /api/advisors/:id
@api_view(['PUT', 'DELETE'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def advisor_update_view(request, pk):
    if request.method == 'DELETE':
        from apps.conversations.models import Conversation
        Conversation.objects.filter(advisor_id=pk).update(advisor_id=None, status='sin_responder')
        Advisor.objects.filter(id=pk).update(activo=False)
        return Response({'success': True})

    try:
        advisor = Advisor.objects.get(id=pk)
    except Advisor.DoesNotExist:
        return Response({'error': 'No encontrado'}, status=status.HTTP_404_NOT_FOUND)
    for field in ['nombre', 'color', 'especialidad', 'max_chats', 'local_tienda', 'rol']:
        val = request.data.get(field)
        if val is not None:
            setattr(advisor, field, val)
    advisor.save()
    return Response({'success': True})


# DELETE /api/advisors/:id (kept for backward compat)
@api_view(['DELETE'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def advisor_delete_view(request, pk):
    from apps.conversations.models import Conversation
    Conversation.objects.filter(advisor_id=pk).update(advisor_id=None, status='sin_responder')
    Advisor.objects.filter(id=pk).update(activo=False)
    return Response({'success': True})


# POST /api/auth/check-in
@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def check_in_view(request):
    from django.utils import timezone
    from .models import AdvisorTurno
    advisor = request.advisor
    now = timezone.now()
    advisor.en_turno = True
    advisor.ultimo_check_in = now
    advisor.save(update_fields=['en_turno', 'ultimo_check_in'])
    AdvisorTurno.objects.create(advisor=advisor, check_in=now)
    return Response({'success': True, 'en_turno': True, 'check_in': now.isoformat()})


# POST /api/auth/check-out
@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def check_out_view(request):
    from django.utils import timezone
    from .models import AdvisorTurno
    advisor = request.advisor
    now = timezone.now()
    advisor.en_turno = False
    advisor.ultimo_check_out = now
    advisor.save(update_fields=['en_turno', 'ultimo_check_out'])
    # Update last open turno
    last_turno = AdvisorTurno.objects.filter(advisor=advisor, check_out__isnull=True).order_by('-check_in').first()
    if last_turno:
        last_turno.check_out = now
        last_turno.duracion_minutos = int((now - last_turno.check_in).total_seconds() / 60)
        last_turno.save()
    return Response({'success': True, 'en_turno': False, 'check_out': now.isoformat()})


# GET /api/advisors/active
@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def advisors_active_view(request):
    advisors = Advisor.objects.filter(activo=True, en_turno=True).order_by('nombre')
    data = []
    for a in advisors:
        d = _user_dict(a)
        d['en_turno'] = a.en_turno
        d['ultimo_check_in'] = a.ultimo_check_in.isoformat() if a.ultimo_check_in else None
        data.append(d)
    return Response(data)


# GET /api/advisors/assignments
@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def advisor_assignments_view(request):
    from apps.conversations.models import Conversation
    advisors = Advisor.objects.filter(activo=True).order_by('nombre')
    data = []
    for a in advisors:
        convs = Conversation.objects.filter(
            advisor_id=a.id
        ).exclude(status='resuelto').values(
            'remote_phone', 'remote_name', 'status'
        )
        chats = [
            {
                'remote_phone': c['remote_phone'],
                'remote_name': c['remote_name'] or '',
                'status': c['status'],
            }
            for c in convs
        ]
        data.append({
            'advisor_id': a.id,
            'advisor_nombre': a.nombre,
            'advisor_color': a.color,
            'chats': chats,
        })
    return Response(data)
