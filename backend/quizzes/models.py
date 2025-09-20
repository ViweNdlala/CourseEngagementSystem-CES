from django.db import models
from accounts.models import User
from courses.models import Course


class Quiz(models.Model):
    title = models.CharField(max_length=255)
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name="quizzes")
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="quizzes")
    timer = models.IntegerField(default=0)  # in minutes, 0 means no time limit
    attempts = models.IntegerField(
        default=0,
        help_text="0 means unlimited attempts, any positive number restricts attempts",
    )
    is_visible = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} (Attempts: {'Unlimited' if self.attempts == 0 else self.attempts})"


class Question(models.Model):
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="questions")
    text = models.CharField(max_length=500)

    def __str__(self):
        return self.text


class Answer(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="answers")
    text = models.CharField(max_length=255)
    is_correct = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.text} ({'Correct' if self.is_correct else 'Wrong'})"


class Attempt(models.Model):
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="attempts_made")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="quiz_attempts")
    attempt_number = models.PositiveIntegerField()
    score = models.PositiveIntegerField(default=0)
    max_score = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("quiz", "user", "attempt_number")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} - {self.quiz.title} (Attempt {self.attempt_number}, Score {self.score}/{self.max_score})"

    @property
    def percentage(self):
        if self.max_score == 0:
            return 0
        return round((self.score / self.max_score) * 100, 2)

    @classmethod
    def latest_or_highest_per_quiz(cls, user):
        """
        Returns a dict with quiz_id → highest percentage for each quiz the user attempted.
        """
        results = {}
        user_attempts = cls.objects.filter(user=user)

        for attempt in user_attempts:
            current_best = results.get(attempt.quiz_id, 0)
            if attempt.percentage > current_best:
                results[attempt.quiz_id] = attempt.percentage

        return results

