from django.shortcuts import render
# courses/views.py
from rest_framework.views import APIView
from rest_framework.generics import RetrieveAPIView


#APIView for course

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Course, Enrollment
from .serializer import CourseSerializer, EnrollmentSerializer
from accounts.models import User

# Course view
class CourseView(APIView):
    serializer_class = CourseSerializer

    def get(self, request):
        #GET /courses/
        #Returns all courses with lecturer id

        courses = Course.objects.all()
        data = [
            {
                "id": course.id,
                "title": course.title,
                "description": course.description,
                "lecturer": course.lecturer.id
            }
            for course in courses
        ]
        return Response(data)

    def post(self, request):
        #POST /courses/
        serializer = CourseSerializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            lecturer = serializer.validated_data['lecturer']
            if lecturer.role != "lecturer":
                return Response({"error": "Only lecturers can create courses"}, status=status.HTTP_400_BAD_REQUEST)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)

# Enrollment view
class EnrollmentView(APIView):
    serializer_class = EnrollmentSerializer

    def get(self, request):

        #GET /enrollments/
        #Returns all enrollments
        
        enrollments = Enrollment.objects.all()
        data = [
            {
                "id": e.id,
                "student": e.student.id,
                "course": e.course.id
            }
            for e in enrollments
        ]
        return Response(data)

    def post(self, request):

        #POST /enrollments/
        #Enroll a student in a course

        serializer = EnrollmentSerializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            student = serializer.validated_data['student']

            if student.role != "student":
                return Response({"error": "Only students can enroll"}, status=status.HTTP_400_BAD_REQUEST)

            course = serializer.validated_data['course']

            if Enrollment.objects.filter(student=student, course=course).exists():
                return Response({"error": "Student already enrolled in this course"}, status=status.HTTP_400_BAD_REQUEST)

            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        

class CourseDetailView(RetrieveAPIView):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
