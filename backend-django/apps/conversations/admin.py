from django.contrib import admin
from .models import Conversation, Chat, InternalNote, ConversationOrigen


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ('remote_phone', 'remote_name', 'status', 'outcome', 'advisor', 'needs_human', 'last_message_at')
    list_filter = ('status', 'outcome', 'needs_human')
    search_fields = ('remote_phone', 'remote_name')
    raw_id_fields = ('advisor',)


@admin.register(Chat)
class ChatAdmin(admin.ModelAdmin):
    list_display = ('remote_phone', 'direction', 'is_ai_response', 'sent_via', 'delivery_status', 'created_at')
    list_filter = ('direction', 'is_ai_response', 'sent_via', 'delivery_status')
    search_fields = ('remote_phone', 'message')


@admin.register(InternalNote)
class InternalNoteAdmin(admin.ModelAdmin):
    list_display = ('remote_phone', 'advisor_nombre', 'note', 'created_at')
    search_fields = ('remote_phone', 'note')


@admin.register(ConversationOrigen)
class ConversationOrigenAdmin(admin.ModelAdmin):
    list_display = ('remote_phone', 'origen', 'detalle', 'detectado_at')
    search_fields = ('remote_phone',)
    list_filter = ('origen',)
