from django.contrib import admin

from .models import VentaCerrada


@admin.register(VentaCerrada)
class VentaCerradaAdmin(admin.ModelAdmin):
    list_display = ('id', 'remote_phone', 'remote_name', 'advisor_nombre', 'monto', 'metodo_pago', 'origen', 'created_at')
    list_filter = ('metodo_pago', 'origen')
    search_fields = ('remote_phone', 'remote_name', 'advisor_nombre')
    ordering = ('-created_at',)
