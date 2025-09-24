from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import transaction
from .models import PointRequest, Leaderboard
from .serializer import PointRequestSerializer, LeaderboardSerializer
from accounts.models import User
from courses.models import Enrollment, Course

# List + Create endpoint for PointRequest
# Students can create requests, lecturers can view pending requests
class PointRequestListCreateView(generics.ListCreateAPIView):
    serializer_class = PointRequestSerializer
    queryset = PointRequest.objects.all().order_by("-created_at")

    def get_queryset(self):
        """
        Filters requests based on query params:
        - Lecturer: pending requests for their courses
        - Student: all requests made by the student
        - Course: all requests for a given course
        """
        qs = super().get_queryset()
        student_id = self.request.query_params.get("student")
        lecturer_id = self.request.query_params.get("lecturer")
        course_id = self.request.query_params.get("course")

        if lecturer_id:
            qs = qs.filter(course__lecturer_id=lecturer_id, approved=False, declined=False).order_by("created_at")

        if student_id:
            qs = qs.filter(student_id=student_id).order_by("-created_at")
            
        if course_id:
            qs = qs.filter(course_id=course_id)
        return qs

    def perform_create(self, serializer):
        # Securely link the request to the currently logged-in student
        user = self.request.user
        if user and user.is_authenticated:
            serializer.save(student=user)
        else:
            serializer.save()

# Approve request endpoint
# Ensures only the correct lecturer can approve + atomically updates leaderboard
class PointRequestApproveView(APIView):
    def post(self, request, pk):
        lecturer_id = request.data.get("lecturer")
        if not lecturer_id:
            return Response({"error": "lecturer id required"}, status=status.HTTP_400_BAD_REQUEST)
         # Validate lecturer and point request exist
        lecturer = get_object_or_404(User, id=lecturer_id)
        pr = get_object_or_404(PointRequest, id=pk)

        # Security check :lecturers can only approve requests for their own courses
        if pr.course.lecturer_id != lecturer.id:
            return Response({"error": "Cannot approve requests for other courses"}, status=status.HTTP_400_BAD_REQUEST)
        # Prevent re-approving or re-declining already handled requests
        if pr.approved or pr.declined:
            return Response({"error": "Cannot approve (already handled)"}, status=status.HTTP_400_BAD_REQUEST)

        # Atomic transaction: prevents race conditions when updating leaderboard
        with transaction.atomic():
            pr.approved = True
            pr.approved_at = timezone.now()
            pr.notification_pending = False
            pr.is_notified = True
            pr.save()

            # Update leaderboard: add points, create entry if student not yet on leaderboard
            leaderboard, _ = Leaderboard.objects.get_or_create(student=pr.student,course=pr.course)
            leaderboard.total_points = leaderboard.total_points + pr.points
            leaderboard.save()

        return Response(PointRequestSerializer(pr).data, status=status.HTTP_200_OK)

# Decline request endpoint
# Mirrors approval but sets declined flag instead
class PointRequestDeclineView(APIView):
    def post(self, request, pk):
        lecturer_id = request.data.get("lecturer")
        if not lecturer_id:
            return Response({"error": "lecturer id required"}, status=status.HTTP_400_BAD_REQUEST)
        lecturer = get_object_or_404(User, id=lecturer_id)
        pr = get_object_or_404(PointRequest, id=pk)
        
        # Only lecturer of the course can decline
        if pr.course.lecturer_id != lecturer.id:
            return Response({"error": "Cannot decline requests for other courses"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Prevent re-processing
        if pr.approved or pr.declined:
            return Response({"error": "Cannot decline (already handled)"}, status=status.HTTP_400_BAD_REQUEST)

        # Update decline flags and mark as notified
        pr.declined = True
        pr.declined_at = timezone.now()
        pr.notification_pending = False
        pr.is_notified = True
        pr.save()

        return Response(PointRequestSerializer(pr).data, status=status.HTTP_200_OK)

# Notification management: mark requests as notified
# Used to signal to the lecturer/student that a request has been handled
class PointRequestMarkNotifiedView(APIView):
    def patch(self, request):
        # Accepts either specific IDs OR lecturer , applies to all requests for that lecturer
        ids = request.data.get("ids")
        lecturer_id = request.data.get("lecturer")

        if ids:
            qs = PointRequest.objects.filter(id__in=ids, approved=False, declined=False, is_notified=False)
        elif lecturer_id:
            lecturer = get_object_or_404(User, id=lecturer_id)
            qs = PointRequest.objects.filter(course__lecturer=lecturer, approved=False, declined=False, is_notified=False)
        else:
            return Response({"error": "ids or lecturer required"}, status=status.HTTP_400_BAD_REQUEST)

        updated = list(qs.values_list("id", flat=True))
        qs.update(is_notified=True, notification_pending=True)
        return Response({"marked": updated}, status=status.HTTP_200_OK)

# Dismiss a notification
# Does not change approval/decline status , only hides persistent banner for that request
class PointRequestDismissNotificationView(APIView):
    def patch(self, request, pk):
        pr = get_object_or_404(PointRequest, id=pk)
        # don't change approved or declined status; just stop showing the persistent notification
        pr.notification_pending = False
        pr.is_notified = True
        pr.save()
        return Response({"dismissed": pk}, status=status.HTTP_200_OK)
    
# Return students in a course who never earned any points
# Helpful for lecturers to identify disengaged students    
class StudentsWithoutPointsView(APIView):
    def get(self, request):
        lecturer_id = request.query_params.get("lecturer_id")
        course_id = request.query_params.get("course_id")

        if not lecturer_id or not course_id:
            return Response(
                {"error": "lecturer_id and course_id required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Confirm course belongs to lecturer for security
            course = Course.objects.get(id=course_id, lecturer_id=lecturer_id)
        except Course.DoesNotExist:
            return Response(
                {"error": "Course not found for this lecturer"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # All students enrolled in this course
        enrolled_students = User.objects.filter(
            id__in=Enrollment.objects.filter(course=course).values_list("student_id", flat=True)
        )

        # Students already on leaderboard
        leaderboard_students = User.objects.filter(
            id__in=Leaderboard.objects.filter(course_id=course_id).values_list("student_id", flat=True)
        )
        # Exclude those already on leaderboard , only keep students with no points
        without_points = enrolled_students.exclude(id__in=leaderboard_students)

        data = [
            {"id": s.id, "name": s.name, "email": s.email}
            for s in without_points
        ]

        return Response({"students_without_points": data}, status=status.HTTP_200_OK)



# Leaderboard listing
# Returns ordered list of students in a course ranked by total points
class LeaderboardView(generics.ListAPIView):
    serializer_class = LeaderboardSerializer

    def get_queryset(self):
        qs = Leaderboard.objects.select_related("student", "course")
        course_id = self.request.query_params.get("course")
        if course_id:
            qs = qs.filter(course_id=course_id)
        return qs.order_by("-total_points")
