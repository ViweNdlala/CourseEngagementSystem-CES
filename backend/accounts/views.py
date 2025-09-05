from django.shortcuts import render
from rest_framework.views import APIView
from .models import *
from rest_framework.response import Response
from .serializer import *


# Create your views here.
class UserView(APIView):
    serializer_class = UserSerializer
    def get(self, request):
        user = [
                { "id":user.id, "name":user.name, "email": user.email, 
                 "password": user.password, "role": user.role}

                for user in User.objects.all()
            ]
        return Response(user)
        
        
    def post(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            serializer.save()
            return Response(serializer.data)