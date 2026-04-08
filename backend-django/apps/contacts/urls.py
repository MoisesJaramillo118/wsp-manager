from django.urls import path

from . import views

urlpatterns = [
    path('groups/', views.GroupListCreate.as_view()),
    path('groups/<int:pk>/', views.GroupDetail.as_view()),
    path('contacts/', views.ContactList.as_view()),
    path('contacts/all', views.ContactAll.as_view()),
    path('contacts/import', views.ContactImport.as_view()),
    path('contacts/export', views.ContactExport.as_view()),
    path('contacts/<int:pk>/', views.ContactDetail.as_view()),
    path('contacts/<int:pk>/tags', views.ContactTagList.as_view()),
    path('contacts/<int:pk>/tags/<int:tag_id>', views.ContactTagRemove.as_view()),
]
