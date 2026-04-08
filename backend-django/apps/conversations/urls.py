from django.urls import path
from . import views

urlpatterns = [
    path('chats/', views.ChatListView.as_view()),
    path('chats/stats', views.ChatStatsView.as_view()),
    path('chats/<str:phone>/', views.ChatDetailView.as_view()),
    path('chats/<str:phone>/send', views.ChatSendView.as_view()),
    path('chats/<str:phone>/assign', views.ChatAssignView.as_view()),
    path('chats/<str:phone>/status', views.ChatStatusView.as_view()),
    path('chats/<str:phone>/outcome', views.ChatOutcomeView.as_view()),
    path('chats/<str:phone>/notes', views.ChatNoteListCreate.as_view()),
    path('chats/<str:phone>/tags', views.ChatTagListCreate.as_view()),
    path('chats/<str:phone>/tags/<int:tag_id>', views.ChatTagRemove.as_view()),
    path('notes/<int:pk>', views.NoteDelete.as_view()),
    path('advisors/auto-assign/<str:phone>', views.AutoAssignView.as_view()),
    path('conversacion/<str:phone>/origen', views.OrigenView.as_view()),
]
