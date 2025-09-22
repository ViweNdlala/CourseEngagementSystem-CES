from django.db import models
from django.utils import timezone
from accounts.models import User
from courses.models import Course

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
    # Notification fields:
    is_notified = models.BooleanField(default=False)        # whether a notification was ever sent
    notification_pending = models.BooleanField(default=False)  # whether notification is active (UI should show it)

    def save(self, *args, **kwargs):
        # compute points if not given
        if not self.points:
            self.points = 10 if self.request_type == "question" else 20
        super().save(*args, **kwargs)

    def __str__(self):
        return f"PointRequest(id={self.id}, student={self.student_id}, course={self.course_id}, type={self.request_type})"


class Leaderboard(models.Model):
    id = models.AutoField(primary_key=True)
    student = models.OneToOneField(User, on_delete=models.CASCADE, related_name="leaderboard")
    total_points = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.student.id} - {self.total_points}"








