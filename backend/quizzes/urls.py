from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import QuizViewSet, QuestionViewSet, AnswerViewSet, AttemptViewSet, user_performance

router = DefaultRouter()
router.register(r'quizzes', QuizViewSet)
router.register(r'questions', QuestionViewSet)
router.register(r'answers', AnswerViewSet)
router.register(r'attempts', AttemptViewSet)

urlpatterns = router.urls + [
    path("attempts/user-performance/<int:user_id>/", user_performance, name="user-performance"),
]
