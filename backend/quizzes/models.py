from django.db import models
from accounts.models import User
from courses.models import Course

class Quiz(models.Model):
    """
    Quiz model linked to a Course and authored by a User (lecturer).
    - Students: take the quiz.
    - Lecturers: manage quiz (set answers, toggle visibility).
    """
    title = models.CharField(max_length=255)
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name="quizzes")
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="quizzes")
    created_at = models.DateTimeField(auto_now_add=True)

    # NEW: Lecturer controls whether quiz is visible to students
    is_visible = models.BooleanField(default=False)

    def __str__(self):
        return self.title


class Question(models.Model):
    """
    Question belonging to a quiz.
    """
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="questions")
    text = models.CharField(max_length=500)

    def __str__(self):
        return self.text


class Answer(models.Model):
    """
    Possible answer for a question.
    One (or more, but usually one) can be marked as correct.
    """
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="answers")
    text = models.CharField(max_length=255)
    is_correct = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.text} ({'Correct' if self.is_correct else 'Wrong'})"
