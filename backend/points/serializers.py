# points/serializers.py
from rest_framework import serializers
from .models import PointRequest

class PointRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = PointRequest
        fields = ['id', 'student', 'course', 'points', 'reason', 'status', 'created_at', 'reviewed_by']
