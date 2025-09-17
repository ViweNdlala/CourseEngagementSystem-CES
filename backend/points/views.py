from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import transaction

from .models import PointRequest, Leaderboard
from .serializer import PointRequestSerializer, LeaderboardSerializer
from accounts.models import User

# List + Create . Browsable API shows the form automatically.
class PointRequestListCreateView(generics.ListCreateAPIView):
    serializer_class = PointRequestSerializer
    queryset = PointRequest.objects.all().order_by("-created_at")

    def get_queryset(self):
        qs = super().get_queryset()
        student_id = self.request.query_params.get("student")
        lecturer_id = self.request.query_params.get("lecturer")
        course_id = self.request.query_params.get("course")

        # If lecturer asked, return pending requests (not approved and not declined) for that lecturer's courses
        if lecturer_id:
            qs = qs.filter(course__lecturer_id=lecturer_id, approved=False, declined=False).order_by("created_at")
        elif student_id:
            # student sees all their requests (history)
            qs = qs.filter(student_id=student_id).order_by("-created_at")
        elif course_id:
            qs = qs.filter(course_id=course_id)
        return qs

    # create uses serializer.create() -> model.save() -> points auto-calculated

# Approve (atomic leaderboard update)
class PointRequestApproveView(APIView):
    def post(self, request, pk):
        lecturer_id = request.data.get("lecturer")
        if not lecturer_id:
            return Response({"error": "lecturer id required"}, status=status.HTTP_400_BAD_REQUEST)

        lecturer = get_object_or_404(User, id=lecturer_id)
        pr = get_object_or_404(PointRequest, id=pk)

        if pr.course.lecturer_id != lecturer.id:
            return Response({"error": "Cannot approve requests for other courses"}, status=status.HTTP_400_BAD_REQUEST)
        if pr.approved or pr.declined:
            return Response({"error": "Cannot approve (already handled)"}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            pr.approved = True
            pr.approved_at = timezone.now()
            pr.notification_pending = False
            pr.is_notified = True
            pr.save()

            leaderboard, _ = Leaderboard.objects.get_or_create(student=pr.student)
            leaderboard.total_points = leaderboard.total_points + pr.points
            leaderboard.save()

        return Response(PointRequestSerializer(pr).data, status=status.HTTP_200_OK)

# Decline endpoint
class PointRequestDeclineView(APIView):
    def post(self, request, pk):
        lecturer_id = request.data.get("lecturer")
        if not lecturer_id:
            return Response({"error": "lecturer id required"}, status=status.HTTP_400_BAD_REQUEST)
        lecturer = get_object_or_404(User, id=lecturer_id)
        pr = get_object_or_404(PointRequest, id=pk)

        if pr.course.lecturer_id != lecturer.id:
            return Response({"error": "Cannot decline requests for other courses"}, status=status.HTTP_400_BAD_REQUEST)
        if pr.approved or pr.declined:
            return Response({"error": "Cannot decline (already handled)"}, status=status.HTTP_400_BAD_REQUEST)

        pr.declined = True
        pr.declined_at = timezone.now()
        pr.notification_pending = False
        pr.is_notified = True
        pr.save()

        return Response(PointRequestSerializer(pr).data, status=status.HTTP_200_OK)

# Mark as notified and set notification_pending True 
class PointRequestMarkNotifiedView(APIView):
    def patch(self, request):
        # accept either 'ids': [1,2] OR 'lecturer': id to mark all for that lecturer
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

# Dismiss a single notification (mark notification_pending False)
class PointRequestDismissNotificationView(APIView):
    def patch(self, request, pk):
        pr = get_object_or_404(PointRequest, id=pk)
        # don't change approved or declined status; just stop showing the persistent notification
        pr.notification_pending = False
        pr.is_notified = True
        pr.save()
        return Response({"dismissed": pk}, status=status.HTTP_200_OK)

# Leaderboard view
class LeaderboardView(generics.ListAPIView):
    serializer_class = LeaderboardSerializer
    queryset = Leaderboard.objects.select_related("student").order_by("-total_points")
