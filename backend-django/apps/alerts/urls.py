from django.urls import path

from . import views

urlpatterns = [
    path('config', views.AlertaConfigView.as_view()),
    path('sin-responder', views.SinResponderView.as_view()),
]
