from django.db import models
from django.utils import timezone
from accounts.models import User
from courses.models import Course

# PointRequest model represents a student's request for points (question or answer) in a course.
# Each request stores its type, points, approval/decline status, and related session.
# Notification flags are included for frontend UI updates.
class PointRequest(models.Model):
    REQUEST_TYPES = [
        ("question", "Question (+10)"),
        ("answer", "Answer (+20)"),
    ]

    id = models.AutoField(primary_key=True)
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="point_requests")
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="point_requests")
    request_type = models.CharField(max_length=20, choices=REQUEST_TYPES)
    points = models.PositiveIntegerField(null=True, blank=True)  # auto-set if None
    approved = models.BooleanField(default=False)
    approved_at = models.DateTimeField(null=True, blank=True)
    declined = models.BooleanField(default=False)
    declined_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    description = models.CharField(blank=True, null=True,max_length=250)
    session_id = models.PositiveIntegerField(null=True, blank=True)
    # Flags for notifications (UI can show pending requests)
    is_notified = models.BooleanField(default=False)        
    notification_pending = models.BooleanField(default=False)  

    def save(self, *args, **kwargs):
        if not self.points:
            self.points = 10 if self.request_type == "question" else 20
        super().save(*args, **kwargs)

    def __str__(self):
        return f"PointRequest(id={self.id}, student={self.student_id}, course={self.course_id}, type={self.request_type})"


# Leaderboard model stores total points of a student for a given course
# Points are incremented when point requests are approved.
class Leaderboard(models.Model):
    id = models.AutoField(primary_key=True)
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="leaderboards")
    course = models.ForeignKey(Course, on_delete=models.CASCADE , default=1)
    total_points = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.student.id} - {self.total_points}"








