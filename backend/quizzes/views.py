from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Quiz, Question, Answer
from .serializers import QuizSerializer, QuestionSerializer, AnswerSerializer


class QuizViewSet(viewsets.ModelViewSet):
    serializer_class = QuizSerializer
    queryset = Quiz.objects.all()
    # permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Quiz.objects.all()
        course_id = self.request.query_params.get("course")
        if course_id:
            queryset = queryset.filter(course_id=course_id)
        return queryset

    def perform_create(self, serializer):
        # Simply call serializer.save(), serializer handles author assignment
        serializer.save()

    def partial_update(self, request, *args, **kwargs):
        quiz = self.get_object()
        data = request.data

        quiz.title = data.get("title", quiz.title)
        quiz.timer = data.get("timer", quiz.timer)
        quiz.is_visible = data.get("is_visible", quiz.is_visible)
        quiz.save()

        if "questions" in data:
            for q_data in data["questions"]:
                question = quiz.questions.filter(id=q_data["id"]).first()
                if question:
                    correct_answer_id = q_data.get("correct_answer")
                    if correct_answer_id:
                        question.answers.update(is_correct=False)
                        question.answers.filter(id=correct_answer_id).update(is_correct=True)

        serializer = self.get_serializer(quiz)
        return Response(serializer.data, status=status.HTTP_200_OK)


class QuestionViewSet(viewsets.ModelViewSet):
    queryset = Question.objects.all()
    serializer_class = QuestionSerializer
    permission_classes = [IsAuthenticated]


class AnswerViewSet(viewsets.ModelViewSet):
    queryset = Answer.objects.all()
    serializer_class = AnswerSerializer
    permission_classes = [IsAuthenticated]
