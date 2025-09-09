from rest_framework import serializers
from .models import Course, Enrollment

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
