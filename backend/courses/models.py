from django.db import models
from accounts.models import User  
from django.utils import timezone
import math 

# Course model
# Represents a course. Each course is linked to a lecturer (User) and has a title/description.
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
# Represents a student enrolled in a specific course. Ensures uniqueness of (student, course) pairs.
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
    

# GeofenceSession model
# Represents a geofencing session for a course, started by a lecturer.
# Tracks active periods, geofence location, and radius.
class GeofenceSession(models.Model):
   
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
        """Return True if the session has expired."""
        return timezone.now() > self.end_time()

    def save(self, *args, **kwargs):
        """
        Override save: automatically deactivate expired sessions.
        Keeps database 'is_active' flag in sync with actual session state.
        """
        if self.is_active and self.is_expired():
            self.is_active = False
        super().save(*args, **kwargs)



# GeofenceAccessLog model
# Logs every student attempt to access a geofence session.
# Includes coordinates, distance from center, and access status.
class GeofenceAccessLog(models.Model):
   
    id = models.AutoField(primary_key=True)
    session = models.ForeignKey(
        GeofenceSession,
        on_delete=models.CASCADE,
        related_name="access_logs",
        null=True,
        blank=True
    )
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="geofence_logs")
    latitude = models.DecimalField(max_digits=24, decimal_places=16, null=True, blank=True)
    longitude = models.DecimalField(max_digits=24, decimal_places=16, null=True, blank=True)
    distance_meters = models.FloatField(null=True, blank=True)
    allowed = models.BooleanField()
    accessed_at = models.DateTimeField(auto_now_add=True)
    note = models.TextField(blank=True)

    def __str__(self):
        return f"AccessLog(student={self.student}, allowed={self.allowed}, at={self.accessed_at})"



# approximate mean Earth radius in meters
EARTH_RADIUS_METERS = 6371000.0  

# Computes distance between two lat/lon coordinates (in meters).
# Used to determine if student is inside geofence radius.
def haversine_distance_m(lat1, lon1, lat2, lon2):
   
    lat1, lon1, lat2, lon2 = map(float, (lat1, lon1, lat2, lon2))

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return EARTH_RADIUS_METERS * c

