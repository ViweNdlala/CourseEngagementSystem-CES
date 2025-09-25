from rest_framework import serializers
from .models import Quiz, Question, Answer, Attempt
from courses.models import Course
from accounts.models import User


class AnswerSerializer(serializers.ModelSerializer):
    """
    Serializer for the Answer model.
    Handles serialization of individual answers to questions.
    """
    class Meta:
        model = Answer
        fields = ["id", "text", "is_correct"]


class QuestionSerializer(serializers.ModelSerializer):
    """
    Serializer for the Question model.
    Includes nested answers using AnswerSerializer.
    """
    answers = AnswerSerializer(many=True)

    class Meta:
        model = Question
        fields = ["id", "text", "answers"]


class QuizSerializer(serializers.ModelSerializer):
    """
    Serializer for the Quiz model.
    Handles nested serialization for questions and answers.
    Provides custom create and update logic for nested relationships.
    """
    questions = QuestionSerializer(many=True)
    author = serializers.ReadOnlyField(source="author.id")  # Author is read-only
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
        """
        Create a quiz along with nested questions and answers.
        Automatically assigns an author if not provided.
        """
        request = self.context.get("request")

        # Determine the author
        if request is None or not hasattr(request, "user") or request.user is None:
            author = User.objects.filter(role="lecturer").first()
            if not author:
                raise serializers.ValidationError("No lecturer user found to assign as author")
        elif getattr(request.user, "is_anonymous", False):
            author = User.objects.filter(role="lecturer").first()
        else:
            author = request.user

        # Extract nested questions
        questions_data = validated_data.pop("questions", [])
        quiz = Quiz.objects.create(author=author, **validated_data)

        # Create questions and answers
        for q_data in questions_data:
            answers_data = q_data.pop("answers", [])
            question = Question.objects.create(quiz=quiz, text=q_data["text"])
            for ans_data in answers_data:
                Answer.objects.create(question=question, **ans_data)

        return quiz

    def update(self, instance, validated_data):
        """
        Update a quiz and its nested questions and answers.
        Handles creation, update, and deletion of nested objects.
        """
        # Update quiz fields
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

            # Update answers
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

            # Delete removed answers
            question.answers.exclude(id__in=existing_answer_ids).delete()

        # Delete removed questions
        instance.questions.exclude(id__in=existing_question_ids).delete()

        return instance


class AttemptSerializer(serializers.ModelSerializer):
    """
    Serializer for the Attempt model.
    Includes user and quiz relationships, attempt number, and computed percentage.
    """
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
        """Return the percentage score for the attempt."""
        return obj.percentage

    def create(self, validated_data):
        """
        Create a new attempt.
        Automatically calculates the next attempt number for the user.
        """
        quiz_id = validated_data.pop("quiz_id")
        user_id = validated_data.pop("user_id")

        # Retrieve related objects
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
    Serializer for performance data used in graphs.
    Uses the Attempt model's percentage property.
    Only the best/latest attempt per quiz per user is included.
    """
    quiz_title = serializers.CharField(source="quiz.title", read_only=True)
    percentage = serializers.SerializerMethodField()

    class Meta:
        model = Attempt
        fields = ["quiz", "quiz_title", "percentage"]

    def get_percentage(self, obj):
        """Return the percentage score for this attempt."""
        return obj.percentage

    @staticmethod
    def build_from_user(user):
        """
        Build serialized performance data for all quizzes attempted by a user.
        Uses Attempt.latest_or_highest_per_quiz() to get best scores.
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
