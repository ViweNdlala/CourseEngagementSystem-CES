# courses/tests.py
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import User
from courses.models import Course, Enrollment, GeofenceSession, GeofenceAccessLog
from datetime import timedelta
from django.utils import timezone


# Courses API Tests

class CourseAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.lecturer = User.objects.create(name="Lecturer", email="lecturer@test.com", role="lecturer")
        self.student = User.objects.create(name="Student", email="student@test.com", role="student")
        self.course = Course.objects.create(title="Math", description="Basics", lecturer=self.lecturer)

    def test_course_list(self):
        url = reverse("courses")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.json()), 1)

    def test_course_detail(self):
        url = reverse("course-detail", args=[self.course.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["id"], self.course.id)
        self.assertEqual(response.json()["title"], self.course.title)

    def test_create_course_only_lecturer(self):
        url = reverse("courses")
        data = {"title": "Physics", "description": "Advanced", "lecturer": self.lecturer.id}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json()["title"], "Physics")

    def test_create_course_non_lecturer_denied(self):
        url = reverse("courses")
        data = {"title": "Biology", "description": "Intro", "lecturer": self.student.id}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Only lecturers can create courses", response.json()["error"])


# Enrollment API Tests

class EnrollmentAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.lecturer = User.objects.create(name="Lecturer", email="lecturer@test.com", role="lecturer")
        self.student = User.objects.create(name="Student", email="student@test.com", role="student")
        self.course = Course.objects.create(title="Science", description="Desc", lecturer=self.lecturer)

    def test_enrollment_only_by_student(self):
        url = reverse("enroll-student")
        data = {"student": self.lecturer.id, "course": self.course.id}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


    def test_duplicate_enrollment_denied(self):
        url = reverse("enroll-student")
        data = {"student": self.student.id, "course": self.course.id}
        self.client.post(url, data, format="json")
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        resp_json = response.json()
        self.assertIn("non_field_errors", resp_json)
        self.assertIn("must make a unique set", resp_json["non_field_errors"][0])


# Geofence Session Tests

class GeofenceSessionAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.lecturer = User.objects.create(name="Lecturer", email="lecturer@test.com", role="lecturer")
        self.student = User.objects.create(name="Student", email="student@test.com", role="student")
        self.course = Course.objects.create(title="Geography", description="Desc", lecturer=self.lecturer)

    def test_multiple_sessions_only_latest_active(self):
        now = timezone.now()
        old_session = GeofenceSession.objects.create(course=self.course, lecturer=self.lecturer,
                                                     latitude=0, longitude=0, radius_meters=100,
                                                     start_time=now - timedelta(hours=2))
        new_session = GeofenceSession.objects.create(course=self.course, lecturer=self.lecturer,
                                                     latitude=0, longitude=0, radius_meters=100,
                                                     start_time=now)
        # Deactivate old manually
        GeofenceSession.objects.filter(course=self.course, is_active=True).exclude(id=new_session.id).update(is_active=False)
        active_sessions = GeofenceSession.objects.filter(course=self.course, is_active=True)
        self.assertEqual(active_sessions.count(), 1)
        self.assertEqual(active_sessions.first().id, new_session.id)

    def test_expired_session_auto_inactive(self):
        expired = GeofenceSession.objects.create(course=self.course, lecturer=self.lecturer,
                                                 latitude=0, longitude=0, radius_meters=100,
                                                 start_time=timezone.now() - timedelta(hours=2),
                                                 duration_minutes=30)
        url = reverse("geofence-active-session") + f"?course_id={self.course.id}"
        response = self.client.get(url)
        expired.refresh_from_db()
        self.assertFalse(expired.is_active)
        self.assertFalse(response.json()["active"])
