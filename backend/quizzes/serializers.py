from rest_framework import serializers
from .models import Quiz, Question, Answer, Attempt
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
    author = serializers.ReadOnlyField(source="author.id")
    course = serializers.PrimaryKeyRelatedField(queryset=Course.objects.all())

    class Meta:
        model = Quiz
        fields = [
            "id",
            "title",
            "author",
            "course",
            "timer",
            "attempts",
            "is_visible",
            "questions",
            "created_at",
        ]

    def create(self, validated_data):
        request = self.context.get("request")
        author = getattr(request, "user", None) or User.objects.filter(role="lecturer").first()
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
        instance.attempts = validated_data.get("attempts", instance.attempts)
        instance.save()

        questions_data = validated_data.get("questions", [])
        existing_question_ids = []

        for q_data in questions_data:
            q_id = q_data.get("id")
            if q_id:
                question = instance.questions.filter(id=q_id).first()
                if question:
                    question.text = q_data.get("text", question.text)
                    question.save()
            else:
                question = Question.objects.create(quiz=instance, text=q_data.get("text", ""))
            existing_question_ids.append(question.id)

            answers_data = q_data.get("answers", [])
            existing_answer_ids = []
            for a_data in answers_data:
                a_id = a_data.get("id")
                if a_id:
                    answer = question.answers.filter(id=a_id).first()
                    if answer:
                        answer.text = a_data.get("text", answer.text)
                        answer.is_correct = a_data.get("is_correct", answer.is_correct)
                        answer.save()
                else:
                    answer = Answer.objects.create(
                        question=question,
                        text=a_data.get("text", ""),
                        is_correct=a_data.get("is_correct", False),
                    )
                existing_answer_ids.append(answer.id)
            question.answers.exclude(id__in=existing_answer_ids).delete()
        instance.questions.exclude(id__in=existing_question_ids).delete()
        return instance

class AttemptSerializer(serializers.ModelSerializer):
    quiz_id = serializers.IntegerField(write_only=True)
    user_id = serializers.IntegerField(write_only=True)
    attempt_number = serializers.IntegerField(read_only=True)
    percentage = serializers.SerializerMethodField(read_only=True)
    quiz_title = serializers.CharField(source="quiz.title", read_only=True)

    class Meta:
        model = Attempt
        fields = [
            "id",
            "quiz_id",
            "quiz_title",
            "user_id",
            "attempt_number",
            "score",
            "max_score",
            "percentage",
            "created_at",
        ]

    def get_percentage(self, obj):
        return obj.percentage

    def create(self, validated_data):
        quiz_id = validated_data.pop("quiz_id")
        user_id = validated_data.pop("user_id")

        try:
            quiz = Quiz.objects.get(id=quiz_id)
        except Quiz.DoesNotExist:
            raise serializers.ValidationError({"quiz_id": "Quiz not found."})

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            raise serializers.ValidationError({"user_id": "User not found."})

        attempt_number = Attempt.objects.filter(quiz=quiz, user=user).count() + 1

        attempt = Attempt.objects.create(
            quiz=quiz,
            user=user,
            attempt_number=attempt_number,
            **validated_data
        )
        return attempt


class PerformanceSerializer(serializers.ModelSerializer):
    """
    Serializer for plotting graph data.
    It uses Attempt model's percentage property.
    Only the best/latest attempt per quiz per user should be fed here.
    """
    quiz_title = serializers.CharField(source="quiz.title", read_only=True)
    percentage = serializers.SerializerMethodField()

    class Meta:
        model = Attempt
        fields = ["quiz", "quiz_title", "percentage"]

    def get_percentage(self, obj):
        return obj.percentage

    @staticmethod
    def build_from_user(user):
        """
        Helper method: returns serialized performance data for all quizzes attempted by a user.
        Uses Attempt.latest_or_highest_per_quiz().
        """
        best_scores = Attempt.latest_or_highest_per_quiz(user)
        attempts = Attempt.objects.filter(user=user, quiz_id__in=best_scores.keys())

        # Keep only the best attempt for each quiz
        best_attempts = []
        for quiz_id, best_percentage in best_scores.items():
            best_attempt = attempts.filter(quiz_id=quiz_id, score__gt=0).order_by("-percentage").first()
            if best_attempt:
                best_attempts.append(best_attempt)

        return PerformanceSerializer(best_attempts, many=True).data