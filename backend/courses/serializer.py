# courses/serializers.py
from rest_framework import serializers
from .models import Course, Enrollment, GeofenceSession, GeofenceAccessLog
from accounts.models import User  # use the User model from accounts app

# Course serializer
class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = ['id', 'title', 'description', 'lecturer']

# Enrollment serializer
class EnrollmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Enrollment
        fields = ['id', 'student', 'course']

# ----- Geofence serializers -----
class GeofenceSessionSerializer(serializers.ModelSerializer):
    # expose lat/lon as floats in the API so frontend receives numeric JSON values
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
    latitude = serializers.FloatField(allow_null=True)
    longitude = serializers.FloatField(allow_null=True)

    class Meta:
        model = GeofenceAccessLog
        fields = '__all__'
        read_only_fields = ['id', 'accessed_at']


class GeofenceAccessCheckSerializer(serializers.Serializer):
    course_id = serializers.IntegerField()
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()
    # allow frontend to pass student id (for dev flow without login)
    student = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role='student'),
        required=False,
        allow_null=True
    )

