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
    """
    API view for listing and creating preparation weeks for a course.
    
    GET: Returns all preparation weeks for a specific course
    POST: Creates a new preparation week, with duplicate prevention
    """
    def get(self, request, course_id):
        try:
            course = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            return Response(
                {"error": "Course not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get weeks ordered by week number
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
        
        # Add course ID to request data for validation
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
    """
    Generic view for individual preparation week operations.
    
    Supports GET, PUT, PATCH, and DELETE operations for specific
    preparation weeks within a course context.
    """
    serializer_class = PreparationWeekSerializer
    lookup_field = 'id'
    
    def get_queryset(self):
        """Filter weeks to only those belonging to specific course."""
        course_id = self.kwargs['course_id']
        return PreparationWeek.objects.filter(course_id=course_id)


class PreparationResourceListView(APIView):
    """
    API view for listing and creating preparation resources within a week.
    
    GET: Returns all resources for a specific preparation week
    POST: Creates a new resource for the preparation week
    """
    
    def get(self, request, course_id, week_id):
        try:
            week = PreparationWeek.objects.get(id=week_id, course_id=course_id)
        except PreparationWeek.DoesNotExist:
            return Response(
                {"error": "Week not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get resources ordered alphabetically by title
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
            # Associate resource with the week
            resource = serializer.save(week=week)
            return Response(
                PreparationResourceSerializer(resource).data,
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PreparationResourceDetailView(RetrieveUpdateDestroyAPIView):
    """
    Generic view for individual preparation resource operations.
    
    Supports GET, PUT, PATCH, and DELETE operations for specific
    resources within a coursecontext.
    """
    serializer_class = PreparationResourceSerializer
    lookup_field = 'id'
    
    def get_queryset(self):
        """Filter resources to only those in the specified course and week."""
        course_id = self.kwargs['course_id']
        week_id = self.kwargs['week_id']
        return PreparationResource.objects.filter(
            week_id=week_id, 
            week__course_id=course_id
        )