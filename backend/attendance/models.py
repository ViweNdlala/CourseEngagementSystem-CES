from django.db import models
from courses.models import Enrollment

class Attendance(models.Model):
    """
    Model to track student attendance for courses.
    
    Maintains attendance records for students in specific courses
    with duplicate prevention.
    """
    
    id = models.AutoField(primary_key=True)
    enrollment = models.ForeignKey(
        Enrollment,
        on_delete=models.CASCADE,
        related_name="attendance_records"
    )
    date = models.DateField()
    status = models.CharField(
        max_length=10,
        choices=[('present', 'Present'), ('absent', 'Absent')],
        default='present'
    )
    marked_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        """prevents duplicate attendance and orders by date (most recent first)"""
        unique_together = ('enrollment', 'date')
        ordering = ['-date']
    
    def __str__(self):
        """Return human-readable attendance record representation."""
        return f"{self.enrollment.student.name} - {self.enrollment.course.title} - {self.date} ({self.status})"