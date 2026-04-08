from django.urls import path
from . import views

urlpatterns = [
    path('catalogs/', views.CatalogListCreate.as_view()),
    path('catalogs/<int:pk>/', views.CatalogDetail.as_view()),
    path('catalogs/<int:pk>/send', views.CatalogSend.as_view()),
]
