
from django.contrib import admin
from django.urls import path, include
from accounts.views import UserView
from courses.views import CourseView , EnrollmentView ,CourseDetailView,GeofenceSessionCreateView, GeofenceActiveView,GeofenceCheckAccessView
from attendance.views import StudentAttendanceView, LecturerAttendanceView
from preparation.views import PreparationWeekListView, PreparationWeekDetailView, PreparationResourceListView, PreparationResourceDetailView


urlpatterns = [
    path('admin/', admin.site.urls),
    path('', UserView.as_view(), name = "user"),
    path('accounts/', include('accounts.urls')),
    path('enrollments/', EnrollmentView.as_view(), name='enroll-student'), 
    path('courses/', CourseView.as_view(), name='courses'),
    path('courses/<int:pk>/', CourseDetailView.as_view(), name='course-detail'),
    path('enrollments/', EnrollmentView.as_view(), name='enroll-student'),
    path('quizzes/', include('quizzes.urls')), 

    path('courses/<int:course_id>/preparation/weeks/', PreparationWeekListView.as_view(), name='preparation-weeks'),
    path('courses/<int:course_id>/preparation/weeks/<int:id>/', PreparationWeekDetailView.as_view(), name='preparation-week-detail'),
    path('courses/<int:course_id>/preparation/weeks/<int:week_id>/resources/', PreparationResourceListView.as_view(), name='preparation-resources'),
    path('courses/<int:course_id>/preparation/weeks/<int:week_id>/resources/<int:id>/', PreparationResourceDetailView.as_view(), name='preparation-resource-detail'),

    path('attendance/student/', StudentAttendanceView.as_view(), name='student_attendance'),
    path('attendance/lecturer/', LecturerAttendanceView.as_view(), name='lecturer_attendance'),
   
    path('geofence/sessions/', GeofenceSessionCreateView.as_view(), name='geofence-sessions'),
    path('geofence/sessions/active/', GeofenceActiveView.as_view(), name='geofence-active-session'),
    path('geofence/check-access/', GeofenceCheckAccessView.as_view(), name='geofence-check-access'),

    path('points/', include('points.urls')),

]
