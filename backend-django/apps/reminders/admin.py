from django.contrib import admin

from .models import Reminder


@admin.register(Reminder)
class ReminderAdmin(admin.ModelAdmin):
    list_display = ('id', 'remote_phone', 'advisor_id', 'note', 'remind_at', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('remote_phone', 'note')
    ordering = ('-remind_at',)
