from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return hasattr(request, 'advisor') and request.advisor and request.advisor.rol == 'admin'


class IsAuthenticated(BasePermission):
    def has_permission(self, request, view):
        return hasattr(request, 'advisor') and request.advisor is not None
