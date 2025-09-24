from django.shortcuts import render
# courses/views.py
from rest_framework.views import APIView
from rest_framework.generics import RetrieveAPIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from .models import Course, Enrollment,GeofenceSession,GeofenceAccessLog,haversine_distance_m
from .serializer import CourseSerializer, EnrollmentSerializer,GeofenceSessionSerializer,GeofenceAccessLogSerializer,GeofenceAccessCheckSerializer
from accounts.models import User


# Course view
# GET: List all courses
# POST: Create course (lecturer-only)
class CourseView(APIView):
    serializer_class = CourseSerializer

    def get(self, request):
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
        serializer = CourseSerializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            lecturer = serializer.validated_data['lecturer']
            if lecturer.role != "lecturer":
                return Response({"error": "Only lecturers can create courses"}, status=status.HTTP_400_BAD_REQUEST)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)

# Enrollment view
# GET: list enrollments
# POST: enroll student (checks role and prevents duplicates)
class EnrollmentView(APIView):
    serializer_class = EnrollmentSerializer

    def get(self, request):
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
      
# Read-only detail view for a specific course
class CourseDetailView(RetrieveAPIView):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer



# GeofenceSessionCreateView
# Create and list geofence sessions.
# Ensures only the lecturer of the course can start a session.
class GeofenceSessionCreateView(APIView):
    serializer_class = GeofenceSessionSerializer

    def get(self, request):
        sessions = GeofenceSession.objects.all()
        serializer = self.serializer_class(sessions, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = GeofenceSessionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        course = serializer.validated_data.get("course")
        lecturer_id = request.data.get("lecturer")  

        if not lecturer_id:
            return Response({"error": "Lecturer ID required"}, status=status.HTTP_400_BAD_REQUEST)

        if course.lecturer_id != int(lecturer_id):
            return Response({"error": "You are not the lecturer for this course"},
                            status=status.HTTP_400_BAD_REQUEST)

        # Deactivate any old active session
        GeofenceSession.objects.filter(course=course, is_active=True).update(is_active=False)

        # Save new session
        session = serializer.save(lecturer_id=lecturer_id)

        return Response(GeofenceSessionSerializer(session).data, status=status.HTTP_201_CREATED)

# Checks if a course has an active geofence session
class GeofenceActiveView(APIView):
    def get(self, request):
        course_id = request.query_params.get("course_id")
        if not course_id:
            return Response({"error": "course_id required"}, status=status.HTTP_400_BAD_REQUEST)

        session = GeofenceSession.objects.filter(course_id=course_id, is_active=True).order_by("-start_time").first()
        if not session or session.is_expired():
            if session and session.is_active:
                session.is_active = False
                session.save()
            return Response({"active": False})
        return Response({"active": True, "session": GeofenceSessionSerializer(session).data})



# Validates if a student is within the geofence radius of an active session
# Logs every attempt and returns distance + allowed flag
class GeofenceCheckAccessView(APIView):
    serializer_class = GeofenceAccessCheckSerializer
    

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)

        course_id = serializer.validated_data['course_id']
        lat = serializer.validated_data['latitude']
        lon = serializer.validated_data['longitude']
        student = serializer.validated_data.get('student', None)

        if student is None:
            if getattr(request, "user", None) and getattr(request.user, "role", None) == "student":
                student = request.user
            else:
                return Response({"error": "student id required in payload when not logged in as a student"}, status=status.HTTP_400_BAD_REQUEST)

        # ensure the supplied student is actually a student
        if getattr(student, "role", None) != "student":
            return Response({"error": "Provided user is not a student"}, status=status.HTTP_400_BAD_REQUEST)

        # ensure the student is enrolled
        if not Enrollment.objects.filter(student=student, course_id=course_id).exists():
            return Response({"allowed": False, "reason": "Not enrolled"}, status=status.HTTP_403_FORBIDDEN)

        # find active session
        session = GeofenceSession.objects.filter(course_id=course_id, is_active=True).order_by("-start_time").first()

        allowed = False
        distance = None
        note = ""
        session_active = False
        session_id = None

        if not session:
            note = "No active geofence session for this course"
        else:
            # if the session is expired, mark it inactive and deny
            if session.is_expired():
                session.is_active = False
                session.save()
                note = "Session expired"
            else:
                session_active = True
                session_id = session.id
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

        return Response({
            "allowed": allowed,
            "distance_meters": distance,
            "note": note,
            "session_active": session_active,
            "session_id": session_id
        })
