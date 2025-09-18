from rest_framework import viewsets, status
from rest_framework.response import Response
from .models import Quiz, Question, Answer
from .serializers import QuizSerializer, QuestionSerializer, AnswerSerializer


class QuizViewSet(viewsets.ModelViewSet):
    """
    Quiz ViewSet:
    - Students: retrieve visible quizzes for their course.
    - Lecturers: update quiz visibility, set correct answers.
    """
    serializer_class = QuizSerializer
    queryset = Quiz.objects.all()

    def get_queryset(self):
        """
        Allow filtering quizzes by course (?course=ID).
        Students will only see visible quizzes (handled on frontend).
        """
        queryset = Quiz.objects.all()
        course_id = self.request.query_params.get("course")
        if course_id:
            queryset = queryset.filter(course_id=course_id)
        return queryset

    def partial_update(self, request, *args, **kwargs):
        """
        Lecturer update handler:
        - Toggle quiz visibility (is_visible).
        - Update correct answers for questions.
        """
        quiz = self.get_object()
        data = request.data

        # ✅ Handle visibility toggle
        if "is_visible" in data:
            quiz.is_visible = data["is_visible"]
            quiz.save()

        # ✅ Handle correct answer updates
        if "questions" in data:
            for q_data in data["questions"]:
                try:
                    question = quiz.questions.get(id=q_data["id"])
                    correct_answer_id = q_data.get("correct_answer")
                    if correct_answer_id:
                        # Reset all answers to false first
                        question.answers.update(is_correct=False)
                        # Mark the chosen answer as correct
                        question.answers.filter(id=correct_answer_id).update(is_correct=True)
                except Question.DoesNotExist:
                    continue

        serializer = self.get_serializer(quiz)
        return Response(serializer.data, status=status.HTTP_200_OK)


class QuestionViewSet(viewsets.ModelViewSet):
    """Direct CRUD access for Questions (not always used by frontend)."""
    queryset = Question.objects.all()
    serializer_class = QuestionSerializer


class AnswerViewSet(viewsets.ModelViewSet):
    """Direct CRUD access for Answers (not always used by frontend)."""
    queryset = Answer.objects.all()
    serializer_class = AnswerSerializer
