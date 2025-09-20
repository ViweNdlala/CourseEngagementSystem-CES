from rest_framework import viewsets, status
from rest_framework.response import Response
from .models import Quiz, Question, Answer, Attempt
from .serializers import QuizSerializer, QuestionSerializer, AnswerSerializer, AttemptSerializer, PerformanceSerializer
from rest_framework.decorators import api_view
from .serializers import PerformanceSerializer
from django.db.models import Max

class QuizViewSet(viewsets.ModelViewSet):
    serializer_class = QuizSerializer
    queryset = Quiz.objects.all()

    def get_queryset(self):
        queryset = Quiz.objects.all()
        course_id = self.request.query_params.get("course")
        if course_id:
            queryset = queryset.filter(course_id=course_id)
        return queryset

    def perform_create(self, serializer):
        serializer.save()


class QuestionViewSet(viewsets.ModelViewSet):
    queryset = Question.objects.all()
    serializer_class = QuestionSerializer


class AnswerViewSet(viewsets.ModelViewSet):
    queryset = Answer.objects.all()
    serializer_class = AnswerSerializer
    
class AttemptViewSet(viewsets.ModelViewSet):
    queryset = Attempt.objects.all()
    serializer_class = AttemptSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        attempt = serializer.save()
        return Response(self.get_serializer(attempt).data, status=status.HTTP_201_CREATED)

@api_view(["GET"])
def user_performance(request, user_id):
    """
    Returns the latest/highest attempt per quiz for the given user.
    """
    # Get latest attempt id per quiz for this user
    latest_attempts = (
        Attempt.objects.filter(user_id=user_id)
        .values("quiz_id")
        .annotate(latest_id=Max("id"))
        .values_list("latest_id", flat=True)
    )

    attempts = Attempt.objects.filter(id__in=latest_attempts)
    serializer = PerformanceSerializer(attempts, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)