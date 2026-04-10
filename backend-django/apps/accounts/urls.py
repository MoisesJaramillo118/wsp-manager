from django.urls import path
from . import views

urlpatterns = [
    path('login', views.login_view),
    path('profiles', views.profiles_view),
    path('me', views.me_view),
    path('password', views.change_password_view),
    path('users', views.create_user_view),
    path('users/<int:user_id>/password', views.reset_user_password_view),
    path('profile/<int:user_id>', views.profile_by_id_view),
    path('check-in', views.check_in_view),
    path('check-out', views.check_out_view),
]
