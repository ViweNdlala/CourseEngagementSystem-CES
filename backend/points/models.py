# Model to track points requests and approvals

from django.db import models
from accounts.models import User
from courses.models import Course

class PointRequest(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("declined", "Declined"),
    ]

    id = models.AutoField(primary_key=True)
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="point_requests")
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="point_requests")
    points = models.IntegerField(default=1)
    reason = models.CharField(max_length=255, null=True, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="reviewed_requests")

    def __str__(self):
        return f"{self.student.name} requested {self.points} pts ({self.status})"
