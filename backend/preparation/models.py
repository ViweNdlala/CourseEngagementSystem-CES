from django.db import models
from courses.models import Course

class PreparationWeek(models.Model):
    """
    Model representing a weekly preparation period for a course.
    
    Each course can have multiple preparation weeks with welcome messages
    and associated learning resources for student preparation.
    """
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="preparation_weeks"
    )
    week_number = models.PositiveIntegerField()
    welcome_message = models.TextField()

    class Meta:
        """Prevents duplicate weeks per course and orders by course then week number"""
        unique_together = ('course', 'week_number')
        ordering = ['course', 'week_number']

    def __str__(self):
        """Return human-readable preparation week representation."""
        return f"{self.course.title} - Week {self.week_number}"


class PreparationResource(models.Model):
    """
    Model for learning resources associated with preparation weeks.
    
    Contains links to external resources that students should 
    review before lectures.
    """
    week = models.ForeignKey(
        PreparationWeek,
        on_delete=models.CASCADE,
        related_name="preparation_resources"
    )
    title = models.CharField(max_length=255)
    url = models.URLField()

    class Meta:
        """Orders resources by week then alphabetically (title)"""
        ordering = ['week', 'title']

    def __str__(self):
        """Return human-readable resource representation."""
        return f"{self.week} - {self.title}"