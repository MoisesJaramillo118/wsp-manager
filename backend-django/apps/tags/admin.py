from django.contrib import admin

from .models import ContactTag, ConversationTag, Tag


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre', 'color', 'created_at')
    search_fields = ('nombre',)


@admin.register(ConversationTag)
class ConversationTagAdmin(admin.ModelAdmin):
    list_display = ('id', 'conversation_phone', 'tag')
    search_fields = ('conversation_phone',)
    list_filter = ('tag',)


@admin.register(ContactTag)
class ContactTagAdmin(admin.ModelAdmin):
    list_display = ('id', 'contact_id', 'tag')
    list_filter = ('tag',)
