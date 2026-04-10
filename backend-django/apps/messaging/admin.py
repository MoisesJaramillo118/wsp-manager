from django.contrib import admin
from .models import Message, Template


@admin.register(Template)
class TemplateAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'categoria', 'activo', 'created_at')
    list_filter = ('categoria', 'activo')
    search_fields = ('nombre', 'contenido')


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'contact_id', 'tipo', 'estado', 'batch_id', 'created_at')
    list_filter = ('tipo', 'estado')
    search_fields = ('contenido', 'batch_id')
