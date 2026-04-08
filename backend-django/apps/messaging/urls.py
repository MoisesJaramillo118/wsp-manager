from django.urls import path
from . import views

urlpatterns = [
    path('templates/', views.TemplateList.as_view()),
    path('templates/<int:pk>/', views.TemplateDetail.as_view()),
    path('send/individual', views.SendIndividual.as_view()),
    path('send/bulk', views.SendBulk.as_view()),
    path('send/schedule', views.SendSchedule.as_view()),
    path('quick-replies/', views.QuickReplyList.as_view()),
    path('quick-replies/<int:pk>/', views.QuickReplyDetail.as_view()),
]
