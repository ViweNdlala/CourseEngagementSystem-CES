from rest_framework import serializers
from .models import Attendance


class StudentAttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attendance
        fields = ['id', 'enrollment', 'date', 'status', 'marked_at']
        read_only_fields = ['marked_at']  # marked_at is auto-generated


class LecturerAttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attendance
        fields = ['id', 'enrollment', 'date', 'status', 'marked_at']
        read_only_fields = ['marked_at']  # marked_at is auto-generated
