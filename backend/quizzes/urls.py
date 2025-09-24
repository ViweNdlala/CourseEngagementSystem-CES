from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import QuizViewSet, QuestionViewSet, AnswerViewSet, AttemptViewSet, user_performance

"""
URL configuration for the quizzes app.

Defines REST API endpoints for quizzes, questions, answers, and attempts
using Django REST Framework viewsets. Includes a custom endpoint for
retrieving a user's performance.
"""

# Create a default router for ViewSets
router = DefaultRouter()
router.register(r'quizzes', QuizViewSet)
router.register(r'questions', QuestionViewSet)
router.register(r'answers', AnswerViewSet)
router.register(r'attempts', AttemptViewSet)

# Combine router URLs with custom URLs
urlpatterns = router.urls + [
    # Custom endpoint to get performance data for a specific user
    path("attempts/user-performance/<int:user_id>/", user_performance, name="user-performance"),
]
