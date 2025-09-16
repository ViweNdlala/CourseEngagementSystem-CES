from rest_framework import serializers
from .models import Quiz, Question, Answer
from courses.models import Course
from accounts.models import User


class AnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Answer
        fields = ["id", "text", "is_correct"]


class QuestionSerializer(serializers.ModelSerializer):
    answers = AnswerSerializer(many=True)

    class Meta:
        model = Question
        fields = ["id", "text", "answers"]


class QuizSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True)
    author = serializers.ReadOnlyField(source="author.id")  # always read-only
    course = serializers.PrimaryKeyRelatedField(queryset=Course.objects.all())

    class Meta:
        model = Quiz
        fields = [
            "id",
            "title",
            "author",
            "course",
            "timer",
            "is_visible",
            "questions",
            "created_at",
        ]

    def create(self, validated_data):
        request = self.context.get("request")
        if request is None or not hasattr(request, "user") or request.user is None:
            # Pick first lecturer as fallback
            lecturer_user = User.objects.filter(role="lecturer").first()
            if not lecturer_user:
                raise serializers.ValidationError("No lecturer user found to assign as author")
            author = lecturer_user
        elif getattr(request.user, "is_anonymous", False):
            # fallback for anonymous users
            author = User.objects.filter(role="lecturer").first()
        else:
            author = request.user

        questions_data = validated_data.pop("questions", [])
        quiz = Quiz.objects.create(author=author, **validated_data)

        for q_data in questions_data:
            answers_data = q_data.pop("answers", [])
            question = Question.objects.create(quiz=quiz, text=q_data["text"])
            for ans_data in answers_data:
                Answer.objects.create(question=question, **ans_data)

        return quiz

    def update(self, instance, validated_data):
        instance.title = validated_data.get("title", instance.title)
        instance.timer = validated_data.get("timer", instance.timer)
        instance.is_visible = validated_data.get("is_visible", instance.is_visible)
        instance.save()

        questions_data = validated_data.get("questions", [])
        for q_data in questions_data:
            question = instance.questions.filter(id=q_data.get("id")).first()
            if question:
                question.text = q_data.get("text", question.text)
                question.save()
                answers_data = q_data.get("answers", [])
                for a_data in answers_data:
                    answer = question.answers.filter(id=a_data.get("id")).first()
                    if answer:
                        answer.text = a_data.get("text", answer.text)
                        answer.is_correct = a_data.get("is_correct", answer.is_correct)
                        answer.save()

        return instance
