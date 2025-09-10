from rest_framework import serializers
from .models import Course, Enrollment,GeofenceSession, GeofenceAccessLog,User

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
    """
    Serializes GeofenceSession. For creating a session, the client should POST:
      {
        "course": <course_id>,
        "latitude": <float>,
        "longitude": <float>,
        "radius_meters": <int>,
        "duration_minutes": <int>
      }
    The view should attach lecturer = request.user (id) before saving.
    """
    class Meta:
        model = GeofenceSession
        # explicit list so clients only see intended fields
        fields = [
            'id', 'course', 'lecturer', 'latitude', 'longitude',
            'radius_meters', 'start_time', 'duration_minutes',
            'is_active', 'created_at'
        ]
        read_only_fields = ['id','is_active', 'created_at']


class GeofenceAccessLogSerializer(serializers.ModelSerializer):
    """
    Serializer for access logs. Usually only used for debugging/auditing.
    """
    class Meta:
        model = GeofenceAccessLog
        fields = '__all__'
        read_only_fields = ['id', 'accessed_at']

# Access check serializer (manual input for browsable API)
class GeofenceAccessCheckSerializer(serializers.Serializer):
    course_id = serializers.IntegerField()
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()
    student = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role='student'),
        required=False
    )
