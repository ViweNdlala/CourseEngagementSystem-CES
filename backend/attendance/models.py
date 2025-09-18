from django.db import models
from courses.models import Enrollment

# Create your models here.
class Attendance(models.Model):
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
    marked_at = models.DateTimeField(auto_now_add=True)  # Automatically set when created
    
    class Meta:
        unique_together = ('enrollment', 'date')  # prevents duplicate attendance on same day
        ordering = ['-date']
    
    def __str__(self):
        return f"{self.enrollment.student.name} - {self.enrollment.course.title} - {self.date} ({self.status})"