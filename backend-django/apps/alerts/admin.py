from django.contrib import admin

from .models import AlertasConfig


@admin.register(AlertasConfig)
class AlertasConfigAdmin(admin.ModelAdmin):
    list_display = ('id', 'minutos_sin_responder', 'activo', 'notificar_admin', 'updated_at')
