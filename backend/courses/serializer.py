from rest_framework import serializers
from .models import Course, Enrollment, GeofenceSession, GeofenceAccessLog
from accounts.models import User  

# Serializes Course model for API
class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = ['id', 'title', 'description', 'lecturer']

# Serializes Enrollment model for API
class EnrollmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Enrollment
        fields = ['id', 'student', 'course']

# Serializes GeofenceSession model for API
# Converts Decimal latitude and longitude to float for JSON
class GeofenceSessionSerializer(serializers.ModelSerializer):
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

# Serializes GeofenceAccessLog for API
class GeofenceAccessLogSerializer(serializers.ModelSerializer):
    latitude = serializers.FloatField(allow_null=True)
    longitude = serializers.FloatField(allow_null=True)

    class Meta:
        model = GeofenceAccessLog
        fields = '__all__'
        read_only_fields = ['id', 'accessed_at']

# Serializer for checking geofence access by a student
class GeofenceAccessCheckSerializer(serializers.Serializer):
    course_id = serializers.IntegerField()
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()
    student = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role='student'),
        required=False,
        allow_null=True
    )

