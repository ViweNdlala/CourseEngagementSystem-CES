# points/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import PointRequest
from .serializers import PointRequestSerializer
from accounts.models import User

class PointRequestView(APIView):
    def get(self, request):
        requests = PointRequest.objects.all()
        serializer = PointRequestSerializer(requests, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = PointRequestSerializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            student = serializer.validated_data['student']
            if student.role != "student":
                return Response({"error": "Only students can request points"}, status=status.HTTP_400_BAD_REQUEST)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)

class PointApprovalView(APIView):
    def post(self, request, pk):
        try:
            point_request = PointRequest.objects.get(pk=pk)
        except PointRequest.DoesNotExist:
            return Response({"error": "Request not found"}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get("action")
        lecturer = request.user  

        if lecturer.role != "lecturer":
            return Response({"error": "Only lecturers can approve/decline"}, status=status.HTTP_403_FORBIDDEN)

        if action == "approve":
            point_request.status = "approved"
            point_request.reviewed_by = lecturer
        elif action == "decline":
            point_request.status = "declined"
            point_request.reviewed_by = lecturer
        else:
            return Response({"error": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)

        point_request.save()
        return Response(PointRequestSerializer(point_request).data)
