from django.contrib import admin
from .models import Catalog


@admin.register(Catalog)
class CatalogAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'categoria', 'filename', 'filesize', 'activo', 'downloads', 'created_at')
    list_filter = ('categoria', 'activo')
    search_fields = ('nombre', 'descripcion', 'keywords')
