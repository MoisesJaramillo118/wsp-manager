from django.contrib import admin

from .models import AISettings


@admin.register(AISettings)
class AISettingsAdmin(admin.ModelAdmin):
    list_display = ('id', 'enabled', 'provider', 'model', 'max_tokens', 'updated_at')
