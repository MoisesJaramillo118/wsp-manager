from django.contrib import admin

from .models import Contact, ContactGroup


@admin.register(ContactGroup)
class ContactGroupAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre', 'color', 'created_at')
    search_fields = ('nombre',)


@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre', 'telefono', 'grupo', 'activo', 'created_at')
    list_filter = ('activo', 'grupo')
    search_fields = ('nombre', 'telefono')
