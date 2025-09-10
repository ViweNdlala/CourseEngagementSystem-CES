from django.db import models
from accounts.models import User  # existing User model
from django.utils import timezone
import math 

# Course model
class Course(models.Model):
    id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=255)
    description = models.TextField()
    lecturer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="lecturer_courses",
        
    )

    def __str__(self):
        return self.title

# Enrollment model
class Enrollment(models.Model):
    id = models.AutoField(primary_key=True)
    student = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="enrollments"
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="enrollments"
    )
    enrolled_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('student', 'course')

    def __str__(self):
        return f"{self.student.name} enrolled in {self.course.title}"
    


# ------------------------
# Geofencing models
# ------------------------

class GeofenceSession(models.Model):
    """
    A geofence session represents that a lecturer has 'started' geofencing for a course.
    A single course may have many sessions over time; only some may be active.
    Fields:
      - course: which course the session is for
      - lecturer: who started it (for auditing and authorization)
      - latitude/longitude: center of the geofence (stored as Decimal degrees)
      - radius_meters: radius in meters
      - start_time + duration_minutes: time window in which this session is valid
      - is_active: quick flag for whether this session should be considered
      - created_at: for auditing
    """
    id = models.AutoField(primary_key=True)
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="geofence_sessions"
    )
    lecturer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="geofence_sessions"
    )
    latitude = models.DecimalField(max_digits=24, decimal_places=16, help_text="Center latitude in decimal degrees")
    longitude = models.DecimalField(max_digits=24, decimal_places=16, help_text="Center longitude in decimal degrees")
    radius_meters = models.PositiveIntegerField(default=100, help_text="Allowed radius in meters")
    start_time = models.DateTimeField(default=timezone.now, help_text="Session start time (UTC-aware)")
    duration_minutes = models.PositiveIntegerField(default=60, help_text="Duration of session in minutes")
    is_active = models.BooleanField(default=True, help_text="Quick flag; session may be auto-deactivated when expired")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"GeofenceSession(course={self.course.id}, lecturer={self.lecturer}, start={self.start_time}, active={self.is_active})"

    def end_time(self):
        """Return the calculated end time for this session (start_time + duration)."""
        return self.start_time + timezone.timedelta(minutes=self.duration_minutes)

    def is_expired(self):
        """Return True if now is after the session's end time."""
        return timezone.now() > self.end_time()

    def save(self, *args, **kwargs):
        """
        Override save: if session claims to be active but is already expired, store as inactive.
        This allows the DB flag to stay in sync automatically when the object is saved.
        """
        if self.is_active and self.is_expired():
            self.is_active = False
        super().save(*args, **kwargs)


class GeofenceAccessLog(models.Model):
    """
    Audit log of student attempts to access protected content.
    Records the session (if any), student, provided coordinates, computed
    distance in meters, whether access was allowed, and a note.
    """
    id = models.AutoField(primary_key=True)
    session = models.ForeignKey(
        GeofenceSession,
        on_delete=models.CASCADE,
        related_name="access_logs",
        null=True,
        blank=True
    )
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="geofence_logs")
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    distance_meters = models.FloatField(null=True, blank=True)
    allowed = models.BooleanField()
    accessed_at = models.DateTimeField(auto_now_add=True)
    note = models.TextField(blank=True)

    def __str__(self):
        return f"AccessLog(student={self.student}, allowed={self.allowed}, at={self.accessed_at})"


# ------------------------
# Geospatial helper
# ------------------------

EARTH_RADIUS_METERS = 6371000.0  # approximate mean Earth radius in meters

def haversine_distance_m(lat1, lon1, lat2, lon2):
    """
    Haversine formula: returns distance in meters between two latitude/longitude points.
    Input: lat/lon in decimal degrees (floats or Decimal-convertible).
    """
    # Ensure floats
    lat1, lon1, lat2, lon2 = map(float, (lat1, lon1, lat2, lon2))

    # Convert degrees to radians
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return EARTH_RADIUS_METERS * c

