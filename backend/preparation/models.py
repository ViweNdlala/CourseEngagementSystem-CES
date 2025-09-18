from django.db import models
from courses.models import Course


class PreparationWeek(models.Model):
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="preparation_weeks"
    )
    week_number = models.PositiveIntegerField()
    welcome_message = models.TextField()

    class Meta:
        unique_together = ('course', 'week_number')
        ordering = ['course', 'week_number']

    def __str__(self):
        return f"{self.course.title} - Week {self.week_number}"


class PreparationResource(models.Model):
    week = models.ForeignKey(
        PreparationWeek,
        on_delete=models.CASCADE,
        related_name="preparation_resources"
    )
    title = models.CharField(max_length=255)
    url = models.URLField()

    class Meta:
        ordering = ['week', 'title']

    def __str__(self):
        return f"{self.week} - {self.title}"