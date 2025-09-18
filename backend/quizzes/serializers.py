from accounts.models import User
from courses.models import Course
from rest_framework import serializers
from .models import Quiz, Question, Answer


class AnswerSerializer(serializers.ModelSerializer):
    """Serialize answers for a question."""

    class Meta:
        model = Answer
        fields = ['id', 'text', 'is_correct']


class QuestionSerializer(serializers.ModelSerializer):
    """
    Serialize a question with nested answers.
    - answers: read/write for student quiz display.
    - correct_answer: lecturer-only field for setting correct answer.
    """
    answers = AnswerSerializer(many=True)
    correct_answer = serializers.PrimaryKeyRelatedField(
        queryset=Answer.objects.all(),
        source="answers",
        write_only=True,
        required=False
    )

    class Meta:
        model = Question
        fields = ['id', 'text', 'answers', 'correct_answer']


class QuizSerializer(serializers.ModelSerializer):
    """
    Serialize quiz with nested questions.
    Includes visibility toggle for lecturer.
    """
    questions = QuestionSerializer(many=True)
    author = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    course = serializers.PrimaryKeyRelatedField(queryset=Course.objects.all())

    class Meta:
        model = Quiz
        fields = ['id', 'title', 'author', 'course', 'questions', 'created_at', 'is_visible']

    def create(self, validated_data):
        """
        Create quiz with nested questions and answers.
        Used when a lecturer creates a new quiz.
        """
        questions_data = validated_data.pop('questions')
        quiz = Quiz.objects.create(**validated_data)
        for q_data in questions_data:
            answers_data = q_data.pop('answers')
            question = Question.objects.create(quiz=quiz, **q_data)
            for ans_data in answers_data:
                Answer.objects.create(question=question, **ans_data)
        return quiz
