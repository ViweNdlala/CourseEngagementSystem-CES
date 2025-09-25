from django.shortcuts import render
from rest_framework.views import APIView
from django.middleware.csrf import get_token
from django.http import JsonResponse
from rest_framework.response import Response
from .models import User
from .serializer import UserSerializer
import bcrypt

def get_csrf_token(request):
    """
    Endpoint to provide a CSRF token for frontend frameworks like React.
    Returns the token in JSON format.
    """
    return JsonResponse({'csrfToken': get_token(request)})


class UserView(APIView):
    """
    API view for handling user-related operations:
    - GET: Retrieve a list of all users
    - POST: Create a new user with validation and password hashing
    """
    serializer_class = UserSerializer
    
    def get(self, request):
        """
        Retrieve all users from the database.
        Returns a list of user objects excluding sensitive data like passwords.
        """
        users = User.objects.all()  # Safe ORM query
        user_data = [
            {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role
            }
            for user in users
        ]
        return Response(user_data)
        
    def post(self, request):
        """
        Create a new user.
        Validates input, checks for duplicate emails,
        hashes the password, and returns user data without password.
        """
        email = request.data.get('email', '').strip()
        password = request.data.get('password', '')

        # Validate input
        if not email or not password:
            return Response({"error": "Email and password are required"}, status=400)

        # Check if user already exists
        if User.objects.filter(email=email).exists():
            return Response({"error": "User already exists"}, status=400)

        # Serialize and save new user
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            user = serializer.save()

            # Return user data without password
            return Response({
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role
            })


class LoginView(APIView):
    """
    API view for user login.
    Handles authentication using either plain text or hashed passwords.
    """
    
    def post(self, request):
        """
        Authenticate a user.
        Checks email and password, verifies credentials,
        and returns user data excluding sensitive information.
        """
        email = request.data.get('email', '').strip()
        password = request.data.get('password', '')

        # Validate input
        if not email or not password:
            return Response({"error": "Email and password are required"}, status=400)

        try:
            user = User.objects.get(email=email)

            # Check password (handles both plain text migration and hashed)
            if user.check_password(password):
                return Response({
                    "id": user.id,
                    "name": user.name,
                    "email": user.email,
                    "role": user.role
                })
            else:
                return Response({"error": "Invalid credentials"}, status=401)

        except User.DoesNotExist:
            return Response({"error": "Invalid credentials"}, status=401)
