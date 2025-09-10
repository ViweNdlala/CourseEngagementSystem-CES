from django.shortcuts import render
# courses/views.py
from rest_framework.views import APIView
from rest_framework.generics import RetrieveAPIView


#APIView for course

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.shortcuts import get_object_or_404
from .models import Course, Enrollment,GeofenceSession,GeofenceAccessLog,haversine_distance_m
from .serializer import CourseSerializer, EnrollmentSerializer,GeofenceSessionSerializer,GeofenceAccessLogSerializer,GeofenceAccessCheckSerializer
from accounts.models import User
from .permissions import IsWithinGeofencePermission

# Course view
class CourseView(APIView):
    serializer_class = CourseSerializer

    def get(self, request):
        #GET /courses/
        #Returns all courses with lecturer id

        courses = Course.objects.all()
        data = [
            {
                "id": course.id,
                "title": course.title,
                "description": course.description,
                "lecturer": course.lecturer.id
            }
            for course in courses
        ]
        return Response(data)

    def post(self, request):
        #POST /courses/
        serializer = CourseSerializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            lecturer = serializer.validated_data['lecturer']
            if lecturer.role != "lecturer":
                return Response({"error": "Only lecturers can create courses"}, status=status.HTTP_400_BAD_REQUEST)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)

# Enrollment view
class EnrollmentView(APIView):
    serializer_class = EnrollmentSerializer

    def get(self, request):

        #GET /enrollments/
        #Returns all enrollments
        
        enrollments = Enrollment.objects.all()
        data = [
            {
                "id": e.id,
                "student": e.student.id,
                "course": e.course.id
            }
            for e in enrollments
        ]
        return Response(data)

    def post(self, request):

        #POST /enrollments/
        #Enroll a student in a course

        serializer = EnrollmentSerializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            student = serializer.validated_data['student']

            if student.role != "student":
                return Response({"error": "Only students can enroll"}, status=status.HTTP_400_BAD_REQUEST)

            course = serializer.validated_data['course']

            if Enrollment.objects.filter(student=student, course=course).exists():
                return Response({"error": "Student already enrolled in this course"}, status=status.HTTP_400_BAD_REQUEST)

            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        

class CourseDetailView(RetrieveAPIView):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer


# ------------------------
# Geofence endpoints
# ------------------------

class GeofenceSessionCreateView(APIView):
    """
    POST /geofence/sessions/
      Lecturer creates (starts) a geofence session for a course.
      Expected POST body:
      {
        "course": <course_id>,
        "latitude": <float>,
        "longitude": <float>,
        "radius_meters": <int>,          # optional (default 100)
        "duration_minutes": <int>        # optional (default 60)
      }
      The view attaches the lecturer = request.user before saving.
      If there is an existing active session for the same course, it is deactivated
      (update is_active=False) before creating the new one.
    """
    #permission_classes = [permissions.IsAuthenticated]

    serializer_class = GeofenceSessionSerializer

    def get(self, request):
        # List all sessions
        sessions = GeofenceSession.objects.all()
        serializer = self.serializer_class(sessions, many=True)
        return Response(serializer.data)


    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Check lecturer role
        lecturer = serializer.validated_data.get("lecturer")
        if not lecturer or lecturer.role != "lecturer":
            return Response(
                {"error": "Only lecturers can create geofence sessions"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Deactivate old active sessions for this course
        course = serializer.validated_data.get("course")
        if course:
            GeofenceSession.objects.filter(course=course, is_active=True).update(is_active=False)

        session = serializer.save()
        return Response(self.serializer_class(session).data, status=status.HTTP_201_CREATED)


class GeofenceActiveView(APIView):
    """
    GET /geofence/sessions/active/?course_id=<id>
      Returns whether there is an active session for the requested course, and
      returns session details if active (so the frontend can draw a circle on a map).
    """
    #permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        course_id = request.query_params.get("course_id")
        if not course_id:
            return Response({"error": "course_id required"}, status=status.HTTP_400_BAD_REQUEST)

        session = GeofenceSession.objects.filter(course_id=course_id, is_active=True).order_by("-start_time").first()
        if not session or session.is_expired():
            # if expired, mark inactive (persist the state)
            if session and session.is_active:
                session.is_active = False
                session.save()
            return Response({"active": False})
        return Response({"active": True, "session": GeofenceSessionSerializer(session).data})


class GeofenceCheckAccessView(APIView):
    """
    POST /geofence/check-access/
      Student posts their coordinates to check if they are allowed to access protected content.
      Expected body:
      {
        "course_id": <course_id>,
        "latitude": <float>,
        "longitude": <float>
      }
      Response:
      {
        "allowed": <true/false>,
        "distance_meters": <float|null>,
        "note": "<string>"
      }
      Each attempt is logged in GeofenceAccessLog for auditing.
    """
    #permission_classes = [permissions.IsAuthenticated]
    serializer_class = GeofenceAccessCheckSerializer
    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        course_id = serializer.validated_data['course_id']
        lat = serializer.validated_data['latitude']
        lon = serializer.validated_data['longitude']
        student = serializer.validated_data.get('student', request.user)  # fallback if using login
       
        

        # Ensure the student is enrolled
        if not Enrollment.objects.filter(student=student, course_id=course_id).exists():
            return Response({"allowed": False, "reason": "Not enrolled"}, status=status.HTTP_403_FORBIDDEN)

        # find active session (if any)
        session = GeofenceSession.objects.filter(course_id=course_id, is_active=True).order_by("-start_time").first()

        allowed = False
        distance = None
        note = ""

        if not session:
            note = "No active geofence session for this course"
        else:
            # if the session is expired, mark it inactive and deny
            if session.is_expired():
                session.is_active = False
                session.save()
                note = "Session expired"
            else:
                # compute distance (haversine) and allow/deny accordingly
                distance = haversine_distance_m(float(lat), float(lon), float(session.latitude), float(session.longitude))
                allowed = (distance <= float(session.radius_meters))
                note = f"Distance {distance:.1f} meters; allowed={allowed}"

        # Persist attempt to log
        GeofenceAccessLog.objects.create(
            session=session,
            student=student,
            latitude=lat,
            longitude=lon,
            distance_meters=distance,
            allowed=allowed,
            note=note
        )

        return Response({"allowed": allowed, "distance_meters": distance, "note": note})
        

# ------------------------
# Example protected view demonstrating usage of the permission
# ------------------------

class ProtectedCourseContentView(APIView):
    """
    Example of a view that returns course-specific protected content and uses the
    IsWithinGeofencePermission to restrict student access based on geofence.
    The frontend must provide course_id, latitude and longitude (in request.data or query params).
    """
    #permission_classes = [permissions.IsAuthenticated, IsWithinGeofencePermission]

    def get(self, request):
        # If permission classes pass, the user is allowed; return protected content.
        return Response({"message": "You are inside the geofence — here is the protected content."})
