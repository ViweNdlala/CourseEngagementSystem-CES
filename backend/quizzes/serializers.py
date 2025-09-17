from rest_framework import serializers
from .models import Quiz, Question, Answer
from courses.models import Course
from accounts.models import User


# -------------------
# Answer Serializer
# -------------------
class AnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Answer
        fields = ["id", "text", "is_correct"]


# -------------------
# Question Serializer
# -------------------
class QuestionSerializer(serializers.ModelSerializer):
    answers = AnswerSerializer(many=True)

    class Meta:
        model = Question
        fields = ["id", "text", "answers"]


# -------------------
# Quiz Serializer
# -------------------
class QuizSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True)
    author = serializers.ReadOnlyField(source="author.id")  # author is always read-only
    course = serializers.PrimaryKeyRelatedField(queryset=Course.objects.all())

    class Meta:
        model = Quiz
        fields = [
            "id",
            "title",
            "author",
            "course",
            "timer",
            "attempts",     #  Added attempts
            "is_visible",
            "questions",
            "created_at",
        ]

    # -------------------
    # CREATE
    # -------------------
    def create(self, validated_data):
        request = self.context.get("request")

        #  Author assignment logic
        if request is None or not hasattr(request, "user") or request.user is None:
            lecturer_user = User.objects.filter(role="lecturer").first()
            if not lecturer_user:
                raise serializers.ValidationError("No lecturer user found to assign as author")
            author = lecturer_user
        elif getattr(request.user, "is_anonymous", False):
            author = User.objects.filter(role="lecturer").first()
        else:
            author = request.user

        #  Pop nested questions
        questions_data = validated_data.pop("questions", [])
        quiz = Quiz.objects.create(author=author, **validated_data)

        #  Create questions + answers
        for q_data in questions_data:
            answers_data = q_data.pop("answers", [])
            question = Question.objects.create(quiz=quiz, text=q_data["text"])
            for ans_data in answers_data:
                Answer.objects.create(question=question, **ans_data)

        return quiz

    # -------------------
    # UPDATE
    # -------------------
    def update(self, instance, validated_data):
        #  Update quiz-level fields
        instance.title = validated_data.get("title", instance.title)
        instance.timer = validated_data.get("timer", instance.timer)
        instance.is_visible = validated_data.get("is_visible", instance.is_visible)
        instance.attempts = validated_data.get("attempts", instance.attempts)
        instance.save()

        #  Handle questions
        questions_data = validated_data.get("questions", [])
        existing_question_ids = []

        for q_data in questions_data:
            q_id = q_data.get("id")
            if q_id:
                # Update existing question
                question = instance.questions.filter(id=q_id).first()
                if question:
                    question.text = q_data.get("text", question.text)
                    question.save()
            else:
                # Create new question
                question = Question.objects.create(quiz=instance, text=q_data.get("text", ""))
            existing_question_ids.append(question.id)

            #  Handle answers
            answers_data = q_data.get("answers", [])
            existing_answer_ids = []
            for a_data in answers_data:
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
                        is_correct=a_data.get("is_correct", False),
                    )
                existing_answer_ids.append(answer.id)

            #  Remove deleted answers
            question.answers.exclude(id__in=existing_answer_ids).delete()

        #  Remove deleted questions
        instance.questions.exclude(id__in=existing_question_ids).delete()

        return instance
