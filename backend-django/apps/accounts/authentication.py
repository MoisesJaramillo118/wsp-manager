import jwt
from django.conf import settings
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from .models import Advisor


class JWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        header = request.META.get('HTTP_AUTHORIZATION', '')
        if not header.startswith('Bearer '):
            return None
        token = header[7:]
        try:
            payload = jwt.decode(token, settings.JWT_SECRET, algorithms=['HS256'])
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed('Token expirado')
        except jwt.InvalidTokenError:
            return None
        try:
            advisor = Advisor.objects.get(id=payload['id'], activo=True)
        except Advisor.DoesNotExist:
            raise AuthenticationFailed('Usuario no encontrado')
        request.advisor = advisor
        return (advisor, token)
