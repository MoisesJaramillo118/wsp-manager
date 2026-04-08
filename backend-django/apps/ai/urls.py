from django.urls import path

from . import views

urlpatterns = [
    path('settings', views.AISettingsView.as_view()),
    path('test', views.AITestView.as_view()),
    path('suggest', views.AISuggestView.as_view()),
]
