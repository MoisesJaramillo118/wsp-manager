from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from django.conf import settings
from django.conf.urls.static import static


def health_check(request):
    return JsonResponse({'status': 'ok'})


from apps.accounts.views import advisors_list_view, advisor_update_view, advisor_delete_view, advisor_assignments_view

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/advisors', advisors_list_view),
    path('api/advisors/', advisors_list_view),
    path('api/advisors/assignments', advisor_assignments_view),
    path('api/advisors/assignments/', advisor_assignments_view),
    path('api/advisors/<int:pk>', advisor_update_view),
    path('api/advisors/<int:pk>/', advisor_update_view),
    path('api/connection/', include('apps.connection.urls')),
    path('api/webhook/', include('apps.webhook.urls')),
    path('api/', include('apps.conversations.urls')),
    path('api/', include('apps.contacts.urls')),
    path('api/', include('apps.messaging.urls')),
    path('api/', include('apps.catalogs.urls')),
    path('api/', include('apps.tags.urls')),
    path('api/ai/', include('apps.ai.urls')),
    path('api/', include('apps.sales.urls')),
    path('api/', include('apps.dashboard.urls')),
    path('api/alertas/', include('apps.alerts.urls')),
    path('api/', include('apps.reminders.urls')),
    path('api/health', health_check),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
