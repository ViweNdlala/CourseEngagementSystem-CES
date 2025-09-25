from rest_framework import serializers
from .models import Course, Enrollment, GeofenceSession, GeofenceAccessLog
from accounts.models import User  


class CourseSerializer(serializers.ModelSerializer):
    """ 
    Serializer for the Course model.
    Converts Course instances to JSON and vice versa.
    Exposes course metadata such as title, description, and lecturer ownership.
    """

    class Meta:
        model = Course
        fields = ['id', 'title', 'description', 'lecturer']


class EnrollmentSerializer(serializers.ModelSerializer):
    """ 
    Serializer for the Enrollment model.
    Manages the relationship between students and courses,
    ensuring that enrollment records can be created, read, or updated via API.
    """
    class Meta:
        model = Enrollment
        fields = ['id', 'student', 'course']


class GeofenceSessionSerializer(serializers.ModelSerializer):
    """ 
    Serializer for the GeofenceSession model.
    Represents active or past geofenced sessions tied to a course.
    Converts latitude and longitude to float for JSON compatibility,
    and exposes details such as radius, start time, and session status.
    """
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()

    class Meta:
        model = GeofenceSession
        fields = [
            'id', 'course', 'lecturer', 'latitude', 'longitude',
            'radius_meters', 'start_time', 'duration_minutes',
            'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'is_active', 'created_at']


class GeofenceAccessLogSerializer(serializers.ModelSerializer):
    """ 
    Serializer for the GeofenceAccessLog model.
    Captures every attempt a student makes to join a geofenced session,
    storing their location and timestamp for auditing and validation purposes.
    """
    latitude = serializers.FloatField(allow_null=True)
    longitude = serializers.FloatField(allow_null=True)

    class Meta:
        model = GeofenceAccessLog
        fields = '__all__'
        read_only_fields = ['id', 'accessed_at']

# Serializer for checking geofence access by a student
class GeofenceAccessCheckSerializer(serializers.Serializer):
    """ 
    Custom serializer for validating student access to a geofenced session.
    Accepts course ID and student coordinates, then verifies
    whether the student falls within the defined geofence.
    Used before granting access to session-related features.
    """
    course_id = serializers.IntegerField()
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()
    student = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role='student'),
        required=False,
        allow_null=True
    )

