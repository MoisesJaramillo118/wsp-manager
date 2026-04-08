from django.urls import path
from . import views

urlpatterns = [
    path('create', views.create_instance_view),
    path('create-with-code', views.create_with_code_view),
    path('status', views.connection_status_view),
    path('qr', views.qr_code_view),
    path('instances', views.list_instances_view),
    path('logout', views.logout_view),
    path('restart', views.restart_view),
    path('delete', views.delete_instance_view),
]
