from django.shortcuts import render
from rest_framework.views import APIView
from django.middleware.csrf import get_token
from django.http import JsonResponse
from .models import *
from rest_framework.response import Response
from .serializer import *
import bcrypt

def get_csrf_token(request):
    """Endpoint to get CSRF token for React"""
    return JsonResponse({'csrfToken': get_token(request)})

class UserView(APIView):
    serializer_class = UserSerializer
    
    def get(self, request):
        # Safe query using ORM
        users = User.objects.all()
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
        # Input validation
        email = request.data.get('email', '').strip()
        password = request.data.get('password', '')
        
        if not email or not password:
            return Response({"error": "Email and password are required"}, status=400)
        
        if User.objects.filter(email=email).exists():
            return Response({"error": "User already exists"}, status=400)
        
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
    def post(self, request):
        # Login with plain text password from frontend
        email = request.data.get('email', '').strip()
        password = request.data.get('password', '')  # Plain text from frontend
        
        if not email or not password:
            return Response({"error": "Email and password are required"}, status=400)
        
        try:
            user = User.objects.get(email=email)
            if user.check_password(password):  # This handles both plain text and hashed
                # Return user data without sensitive information
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