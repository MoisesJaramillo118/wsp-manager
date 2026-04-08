from django.contrib import admin
from .models import Advisor


@admin.register(Advisor)
class AdvisorAdmin(admin.ModelAdmin):
    list_display = ['id', 'nombre', 'email', 'rol', 'activo', 'created_at']
    list_filter = ['rol', 'activo']
    search_fields = ['nombre', 'email']
    ordering = ['nombre']
