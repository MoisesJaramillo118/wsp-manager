from django.urls import path

from . import views

urlpatterns = [
    path('ventas-cerradas', views.VentaListCreate.as_view()),
    path('ventas-cerradas/stats', views.VentaStats.as_view()),
    path('ventas-cerradas/export', views.VentaExport.as_view()),
]
