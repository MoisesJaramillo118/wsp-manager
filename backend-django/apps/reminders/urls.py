from django.urls import path

from . import views

urlpatterns = [
    path('reminders/', views.ReminderList.as_view()),
    path('reminders/due', views.ReminderDue.as_view()),
    path('reminders/<int:pk>/', views.ReminderDetail.as_view()),
]
