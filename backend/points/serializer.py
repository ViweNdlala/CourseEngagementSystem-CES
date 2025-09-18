from rest_framework import serializers
from .models import PointRequest, Leaderboard

class PointRequestSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.name", read_only=True)
    course_title = serializers.CharField(source="course.title", read_only=True)

    class Meta:
        model = PointRequest
        fields = [
            "id",
            "student",
            "student_name",
            "course",
            "course_title",
            "request_type",
            "points",
            "approved",
            "approved_at",
            "declined",
            "declined_at",
            "created_at",
            "is_notified",
            "notification_pending",
        ]
        read_only_fields = ["id", "student_name", "course_title", "approved", "approved_at", "declined", "declined_at", "created_at"]

class LeaderboardSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.name", read_only=True)

    class Meta:
        model = Leaderboard
        fields = ["id", "student", "student_name", "total_points"]
        read_only_fields = ["id", "student", "student_name", "total_points"]




