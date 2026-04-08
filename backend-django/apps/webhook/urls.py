from django.urls import path

from . import views

urlpatterns = [
    path('messages', views.WebhookView.as_view()),
]
