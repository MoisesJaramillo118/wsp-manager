from django.urls import path

from . import views

urlpatterns = [
    path('tags/', views.TagListCreate.as_view()),
    path('tags/<int:pk>/', views.TagDelete.as_view()),
]
