from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.generics import RetrieveUpdateDestroyAPIView

from .models import PreparationWeek, PreparationResource
from .serializer import (
    PreparationWeekSerializer, 
    PreparationWeekCreateSerializer,
    PreparationResourceSerializer
)
from courses.models import Course


class PreparationWeekListView(APIView):
    def get(self, request, course_id):
        try:
            course = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            return Response(
                {"error": "Course not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        weeks = PreparationWeek.objects.filter(course=course).order_by('week_number')
        serializer = PreparationWeekSerializer(weeks, many=True)
        return Response(serializer.data)
    
    def post(self, request, course_id):
        try:
            course = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            return Response(
                {"error": "Course not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Add course to request data
        data = request.data.copy()
        data['course'] = course_id
        
        serializer = PreparationWeekCreateSerializer(data=data)
        if serializer.is_valid():
            # Check if week already exists
            week_number = serializer.validated_data['week_number']
            if PreparationWeek.objects.filter(
                course=course, 
                week_number=week_number
            ).exists():
                return Response(
                    {"error": f"Week {week_number} already exists for this course"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            week = serializer.save()
            return Response(
                PreparationWeekSerializer(week).data, 
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PreparationWeekDetailView(RetrieveUpdateDestroyAPIView):
    serializer_class = PreparationWeekSerializer
    lookup_field = 'id'
    
    def get_queryset(self):
        course_id = self.kwargs['course_id']
        return PreparationWeek.objects.filter(course_id=course_id)


class PreparationResourceListView(APIView):
    def get(self, request, course_id, week_id):
        try:
            week = PreparationWeek.objects.get(id=week_id, course_id=course_id)
        except PreparationWeek.DoesNotExist:
            return Response(
                {"error": "Week not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        resources = PreparationResource.objects.filter(week=week).order_by('title')
        serializer = PreparationResourceSerializer(resources, many=True)
        return Response(serializer.data)
    
    def post(self, request, course_id, week_id):
        try:
            week = PreparationWeek.objects.get(id=week_id, course_id=course_id)
        except PreparationWeek.DoesNotExist:
            return Response(
                {"error": "Week not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = PreparationResourceSerializer(data=request.data)
        if serializer.is_valid():
            resource = serializer.save(week=week)
            return Response(
                PreparationResourceSerializer(resource).data,
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PreparationResourceDetailView(RetrieveUpdateDestroyAPIView):
    serializer_class = PreparationResourceSerializer
    lookup_field = 'id'
    
    def get_queryset(self):
        course_id = self.kwargs['course_id']
        week_id = self.kwargs['week_id']
        return PreparationResource.objects.filter(
            week_id=week_id, 
            week__course_id=course_id
        )