from django.urls import path
from .views import UserView, LoginView, get_csrf_token

urlpatterns = [
    path('', UserView.as_view(), name="user"),
    path('login/', LoginView.as_view(), name="login"),
    path('csrf/', get_csrf_token, name="csrf_token"),
]