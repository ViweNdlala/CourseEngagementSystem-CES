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
        """
        Handles creating a new quiz with nested questions & answers.
        Your QuizSerializer should already support nested create.
        """
        serializer.save()

    def partial_update(self, request, *args, **kwargs):
        quiz = self.get_object()
        data = request.data

        #  Update top-level fields
        quiz.title = data.get("title", quiz.title)
        quiz.timer = data.get("timer", quiz.timer)
        quiz.is_visible = data.get("is_visible", quiz.is_visible)
        quiz.attempts = data.get("attempts", quiz.attempts)
        quiz.save()

        #  Handle questions & answers
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

                # Handle answers for this question
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

                    # (Optional) Remove answers not in payload
                    question.answers.exclude(id__in=existing_answer_ids).delete()

            # (Optional) Remove questions not in payload
            quiz.questions.exclude(id__in=existing_question_ids).delete()

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
