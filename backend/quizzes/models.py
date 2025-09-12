from django.db import models
from accounts.models import User  # Import custom User model from accounts

# Quiz model
class Quiz(models.Model):
    # User who created the quizz
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name="quizzes")

    # Quizz metadata
    title = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    times_taken = models.IntegerField(default=0, editable=False)

    # Count number of questions belonging to the quizz
    @property
    def question_count(self):
        return self.questions.count()


    class Meta:
        verbose_name_plural = "Quizzes"
        ordering = ['id']       

    def __str__(self):
        return self.title


# Question model
class Question(models.Model):
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="questions")
    text = models.CharField(max_length=500)

    def __str__(self):
        return self.text

# Quiz answer object
class Answer(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="answers")
    text = models.CharField(max_length=255)
    is_correct = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.text} ({'Correct' if self.is_correct else 'Wrong'})"

# Define quizz attempts
class Attempt(models.Model):
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="attempts")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="attempts")
    score = models.IntegerField(default=0)
    completed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.name} - {self.quiz.title} ({self.score})"
