from rest_framework import serializers
from .models import PointRequest, Leaderboard

#Serializer for PointRequest
#Exposes student name and course title for read-only purposes
#Validates description length, session association, and limits requests per session
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
            "description",
            "session_id",
        ]
        read_only_fields = ["id", "student_name", "course_title", "approved", "approved_at", "declined", "declined_at", "created_at"]
    def validate(self, data):
        """
        Ensures:
        1. Description is provided and under 250 characters.
        2. Session ID exists (to prevent unlimited requests per session).
        3. Student and course are provided.
        4. Limits maximum of 2 requests per (student, course, session) to enforce fairness.
        """
        description = (data.get("description") or "").strip()
        if not description:
            raise serializers.ValidationError({"description": "Please provide a short description of the question or answer."})
        if len(description) > 250:
            raise serializers.ValidationError({"description": "Description too long (max 250 characters)."})

        session_id = data.get("session_id")
        if session_id is None:
            raise serializers.ValidationError({"session_id": "session_id is required to limit requests per session."})

       
        student = data.get("student") or (self.context.get("request").user if self.context.get("request") else None)
        if not student:
            raise serializers.ValidationError({"student": "Student is required."})

        course = data.get("course")
        if not course:
            raise serializers.ValidationError({"course": "Course is required."})

        
        existing = PointRequest.objects.filter(student=student, course=course, session_id=session_id).count()
        if existing >= 2:
            raise serializers.ValidationError("You have reached the maximum of 2 point requests for this session.")

        return data
#Serializer for Leaderboard
#leaderboard updates are handled in approve endpoint    
class LeaderboardSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.name", read_only=True)

    class Meta:
        model = Leaderboard
        fields = ["id", "student", "student_name", "total_points"]
        read_only_fields = ["id", "student", "student_name", "total_points"]




