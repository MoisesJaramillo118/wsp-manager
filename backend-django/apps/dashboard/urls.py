from django.urls import path

from . import views

urlpatterns = [
    path('dashboard/stats', views.DashboardStats.as_view()),
    path('dashboard/stats/export', views.DashboardStatsExport.as_view()),
    path('dashboard/alerts', views.DashboardAlerts.as_view()),
    path('dashboard/advisor-performance', views.AdvisorPerformance.as_view()),
    path('dashboard/weekly-chart', views.WeeklyChart.as_view()),
    path('dashboard/conversion-diaria', views.ConversionDiariaView.as_view()),
    path('dashboard/conversion-diaria/', views.ConversionDiariaView.as_view()),
    path('dashboard/admin-kpi', views.AdminKPIView.as_view()),
    path('dashboard/admin-kpi/', views.AdminKPIView.as_view()),
]
