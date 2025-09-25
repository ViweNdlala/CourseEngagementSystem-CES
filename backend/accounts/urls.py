from django.urls import path
from .views import UserView, LoginView, get_csrf_token

"""
URL configuration for the accounts app.

Defines the routes for user-related actions, including:
- User creation and management
- User login
- CSRF token retrieval
"""

urlpatterns = [
    # Route for creating and managing users
    path('', UserView.as_view(), name="user"),

    # Route for user login
    path('login/', LoginView.as_view(), name="login"),

    # Route to retrieve a CSRF token
    path('csrf/', get_csrf_token, name="csrf_token"),
]
