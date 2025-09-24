from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import api_view
from django.db.models import Max
from .models import Quiz, Question, Answer, Attempt
from .serializers import QuizSerializer, QuestionSerializer, AnswerSerializer, AttemptSerializer, PerformanceSerializer

"""
Views for the quizzes app.

Includes:
- ViewSets for Quiz, Question, Answer, and Attempt models.
- Custom endpoint to get user performance data.
"""

# -------------------
# Quiz ViewSet
# -------------------
class QuizViewSet(viewsets.ModelViewSet):
    """
    ViewSet for CRUD operations on Quiz model.
    Supports nested updates for questions and answers.
    """
    serializer_class = QuizSerializer
    queryset = Quiz.objects.all()

    def get_queryset(self):
        """
        Optionally filters quizzes by course ID if provided as a query parameter.
        """
        queryset = Quiz.objects.all()
        course_id = self.request.query_params.get("course")
        if course_id:
            queryset = queryset.filter(course_id=course_id)
        return queryset

    def perform_create(self, serializer):
        """
        Handle creating a new quiz.
        Nested questions and answers are handled by QuizSerializer.
        """
        serializer.save()

    def partial_update(self, request, *args, **kwargs):
        """
        Partially update a quiz and its nested questions and answers.
        Supports creation, update, and deletion of nested objects.
        """
        quiz = self.get_object()
        data = request.data

        # Update top-level quiz fields
        quiz.title = data.get("title", quiz.title)
        quiz.timer = data.get("timer", quiz.timer)
        quiz.is_visible = data.get("is_visible", quiz.is_visible)
        quiz.attempts = data.get("attempts", quiz.attempts)
        quiz.save()

        # Update nested questions and answers
        if "questions" in data:
            existing_question_ids = []

            for q_data in data["questions"]:
                q_id = q_data.get("id")
                if q_id:
                    # Update existing question
                    question = quiz.questions.filter(id=q_id).first()
                    if question:
                        question.text = q_data.get("text", question.text)
                        question.save()
                else:
                    # Create new question
                    question = Question.objects.create(
                        quiz=quiz,
                        text=q_data.get("text", "")
                    )
                existing_question_ids.append(question.id)

                # Update answers for this question
                if "answers" in q_data:
                    existing_answer_ids = []
                    for a_data in q_data["answers"]:
                        a_id = a_data.get("id")
                        if a_id:
                            # Update existing answer
                            answer = question.answers.filter(id=a_id).first()
                            if answer:
                                answer.text = a_data.get("text", answer.text)
                                answer.is_correct = a_data.get("is_correct", answer.is_correct)
                                answer.save()
                        else:
                            # Create new answer
                            answer = Answer.objects.create(
                                question=question,
                                text=a_data.get("text", ""),
                                is_correct=a_data.get("is_correct", False)
                            )
                        existing_answer_ids.append(answer.id)

                    # Remove answers not in payload
                    question.answers.exclude(id__in=existing_answer_ids).delete()

            # Remove questions not in payload
            quiz.questions.exclude(id__in=existing_question_ids).delete()

        serializer = self.get_serializer(quiz)
        return Response(serializer.data, status=status.HTTP_200_OK)


# -------------------
# Question ViewSet
# -------------------
class QuestionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for CRUD operations on Question model.
    """
    queryset = Question.objects.all()
    serializer_class = QuestionSerializer


# -------------------
# Answer ViewSet
# -------------------
class AnswerViewSet(viewsets.ModelViewSet):
    """
    ViewSet for CRUD operations on Answer model.
    """
    queryset = Answer.objects.all()
    serializer_class = AnswerSerializer


# -------------------
# Attempt ViewSet
# -------------------
class AttemptViewSet(viewsets.ModelViewSet):
    """
    ViewSet for CRUD operations on Attempt model.
    Handles creation with automatic attempt numbering.
    """
    queryset = Attempt.objects.all()
    serializer_class = AttemptSerializer

    def create(self, request, *args, **kwargs):
        """
        Create a new attempt using AttemptSerializer.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        attempt = serializer.save()
        return Response(self.get_serializer(attempt).data, status=status.HTTP_201_CREATED)


# -------------------
# Custom endpoint: User Performance
# -------------------
@api_view(["GET"])
def user_performance(request, user_id):
    """
    Returns the latest attempt per quiz for the given user.
    Uses Max aggregation to get the most recent attempt ID per quiz.
    """
    latest_attempts = (
        Attempt.objects.filter(user_id=user_id)
        .values("quiz_id")
        .annotate(latest_id=Max("id"))
        .values_list("latest_id", flat=True)
    )

    attempts = Attempt.objects.filter(id__in=latest_attempts)
    serializer = PerformanceSerializer(attempts, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)
