from rest_framework import serializers
from .models import Attendance

class StudentAttendanceSerializer(serializers.ModelSerializer):
    """
    StudentAttendanceSerializer
    Fields:
      - id: primary key (read-only)
      - enrollment: reference to the enrollment/student this attendance belongs to
      - date: date of the attendance entry
      - status: attendance status (e.g. present/absent)
      - marked_at: timestamp when the record was created/marked (read-only)
    """
    class Meta:
        model = Attendance
        fields = ['id', 'enrollment', 'date', 'status', 'marked_at']
        read_only_fields = ['marked_at']

class LecturerAttendanceSerializer(serializers.ModelSerializer):
    """
    LecturerAttendanceSerializer
    Fields and behavior mirror StudentAttendanceSerializer by default, but this
    serializer is the appropriate extension point for lecturer-specific logic:
      - additional validation or permissions (e.g. marking attendance for any
        enrollment),
      - different field visibility (e.g. reveal related student details),
      - support for bulk operations
    """
    class Meta:
        model = Attendance
        fields = ['id', 'enrollment', 'date', 'status', 'marked_at']
        read_only_fields = ['marked_at']
