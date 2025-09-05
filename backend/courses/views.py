from django.shortcuts import render
# courses/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Course
from .serializer import CourseSerializer

#APIView for courses
class CourseView(APIView):
    serializer_class = CourseSerializer

    # GET   list all courses
    def get(self, request):
        courses = [
            {
                "id": course.id,
                "name": course.name,
                "description": course.description,
                "location": course.location
            }
            for course in Course.objects.all()
        ]
        return Response({"courses": courses})

    # POST   create a new course
    def post(self, request):
        serializer = CourseSerializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            serializer.save()
            return Response(serializer.data)
        
class CourseDetailView(APIView):
    def get(self, request, pk):
        try:
            course = Course.objects.get(pk=pk)
            serializer = CourseSerializer(course)
            return Response(serializer.data)
        except Course.DoesNotExist:
            return Response({"error": "Course not found"}, status=404)

# Create your views here.
