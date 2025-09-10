# courses/permissions.py
from rest_framework import permissions
from .models import GeofenceSession, Enrollment, haversine_distance_m

class IsWithinGeofencePermission(permissions.BasePermission):
    """
    DRF permission that allows access only if:
      - the request user is a student and
      - there is an active geofence session for the provided course_id and
      - the student's provided coordinates (latitude, longitude) fall within the session radius.

    Expected input sources (in order of precedence):
      1. request.data['course_id'], request.data['latitude'], request.data['longitude']
      2. request.query_params
      3. view kwargs (if you attach course_id to the view)

    Returns True for non-student users (lecturers/admin) so you can
    protect student-only pages without blocking admins.
    """
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        # Bypass for non-students (adjust as you need)
        if getattr(user, "role", None) != "student":
            return True

        # Try request.data first, then query params, then view kwargs
        course_id = request.data.get("course_id") or request.query_params.get("course_id") or getattr(view, "course_id", None)
        lat = request.data.get("latitude") or request.query_params.get("latitude")
        lon = request.data.get("longitude") or request.query_params.get("longitude")

        # If required inputs missing, deny permission
        if not all([course_id, lat, lon]):
            return False

        # Check enrollment: only enrolled students can pass
        if not Enrollment.objects.filter(student=user, course_id=course_id).exists():
            return False

        # Get active session for the course
        session = GeofenceSession.objects.filter(course_id=course_id, is_active=True).order_by("-start_time").first()
        if not session or session.is_expired():
            # either no active session or it's expired
            return False

        # Compute distance; session.latitude/longitude may be Decimal, convert to float
        distance = haversine_distance_m(float(lat), float(lon), float(session.latitude), float(session.longitude))
        return distance <= float(session.radius_meters)
