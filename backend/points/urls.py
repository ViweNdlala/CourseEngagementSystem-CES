from django.urls import path
from .views import (PointRequestListCreateView,PointRequestApproveView,PointRequestDeclineView,PointRequestMarkNotifiedView,PointRequestDismissNotificationView,LeaderboardView,StudentsWithoutPointsView)

urlpatterns = [
    path("requests/", PointRequestListCreateView.as_view(), name="point-requests"),                  
    path("requests/<int:pk>/approve/", PointRequestApproveView.as_view(), name="approve-point-request"),
    path("requests/<int:pk>/decline/", PointRequestDeclineView.as_view(), name="decline-point-request"),
    path("requests/mark_notified/", PointRequestMarkNotifiedView.as_view(), name="mark-notified"),
    path("requests/<int:pk>/dismiss_notification/", PointRequestDismissNotificationView.as_view(), name="dismiss-notification"),
    path("leaderboard/", LeaderboardView.as_view(), name="leaderboard"),
    path("students/without-points/", StudentsWithoutPointsView.as_view(), name="students-without-points"),
]


