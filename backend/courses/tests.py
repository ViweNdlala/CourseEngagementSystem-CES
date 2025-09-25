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
    """
    Tests for Course API endpoints.
    Covers listing, retrieving, and creating courses,
    while enforcing role restrictions (lecturer-only creation).
    """

    def setUp(self):
        self.client = APIClient()
        self.lecturer = User.objects.create(name="Lecturer", email="lecturer@test.com", role="lecturer")
        self.student = User.objects.create(name="Student", email="student@test.com", role="student")
        self.course = Course.objects.create(title="Math", description="Basics", lecturer=self.lecturer)

    def test_course_list(self):
        #Ensure all courses can be listed successfully.
        url = reverse("courses")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.json()), 1)

    def test_course_detail(self):
        #Ensure course details can be retrieved correctly
        url = reverse("course-detail", args=[self.course.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["id"], self.course.id)
        self.assertEqual(response.json()["title"], self.course.title)

    def test_create_course_only_lecturer(self):
        #Ensure lecturers can create new courses
        url = reverse("courses")
        data = {"title": "Physics", "description": "Advanced", "lecturer": self.lecturer.id}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json()["title"], "Physics")

    def test_create_course_non_lecturer_denied(self):
        #Ensure students cannot create courses.
        url = reverse("courses")
        data = {"title": "Biology", "description": "Intro", "lecturer": self.student.id}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json()["error"], "Only lecturers can create courses")



class EnrollmentAPITest(TestCase):
    """
    Tests for Enrollment API endpoints.
    Validates enrollment restrictions such as student-only
    enrollment and prevention of duplicates.
    """
    def setUp(self):
        self.client = APIClient()
        self.lecturer = User.objects.create(name="Lecturer", email="lecturer@test.com", role="lecturer")
        self.student = User.objects.create(name="Student", email="student@test.com", role="student")
        self.course = Course.objects.create(title="Science", description="Desc", lecturer=self.lecturer)

    def test_enrollment_only_by_student(self):
        #Ensure lecturers cannot enroll in courses
        url = reverse("enroll-student")
        data = {"student": self.lecturer.id, "course": self.course.id}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json()["error"], "Only students can enroll")

    def test_duplicate_enrollment_denied(self):
        #Ensure duplicate enrollments are rejected
        url = reverse("enroll-student")
        data = {"student": self.student.id, "course": self.course.id}
        self.client.post(url, data, format="json")  # first enrollment
        response = self.client.post(url, data, format="json")  # duplicate
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("non_field_errors", response.json())
        self.assertIn("must make a unique set", response.json()["non_field_errors"][0])


class GeofenceSessionAPITest(TestCase):
    """
    Tests for GeofenceSession behavior.
    Ensures only one active session per course and
    verifies automatic expiration handling.
    """

    def setUp(self):
        self.client = APIClient()
        self.lecturer = User.objects.create(name="Lecturer", email="lecturer@test.com", role="lecturer")
        self.student = User.objects.create(name="Student", email="student@test.com", role="student")
        self.course = Course.objects.create(title="Geography", description="Desc", lecturer=self.lecturer)

    def test_multiple_sessions_only_latest_active(self):
        #Ensure only the most recent session remains active
        now = timezone.now()
        old_session = GeofenceSession.objects.create(course=self.course, lecturer=self.lecturer,
                                                     latitude=0, longitude=0, radius_meters=100,
                                                     start_time=now - timedelta(hours=2))
        new_session = GeofenceSession.objects.create(course=self.course, lecturer=self.lecturer,
                                                     latitude=0, longitude=0, radius_meters=100,
                                                     start_time=now)
        GeofenceSession.objects.filter(course=self.course, is_active=True).exclude(id=new_session.id).update(is_active=False)
        active_sessions = GeofenceSession.objects.filter(course=self.course, is_active=True)
        self.assertEqual(active_sessions.count(), 1)
        self.assertEqual(active_sessions.first().id, new_session.id)

    def test_expired_session_auto_inactive(self):
        #Ensure sessions expire after their duration passes
        expired = GeofenceSession.objects.create(course=self.course, lecturer=self.lecturer,
                                                 latitude=0, longitude=0, radius_meters=100,
                                                 start_time=timezone.now() - timedelta(hours=2),
                                                 duration_minutes=30)
        url = reverse("geofence-active-session") + f"?course_id={self.course.id}"
        response = self.client.get(url)
        expired.refresh_from_db()
        self.assertFalse(expired.is_active)
        self.assertFalse(response.json()["active"])


# Geofence Access Tests
class GeofenceAccessAPITest(TestCase):
    """
    Tests for student access to geofenced sessions.
    Validates geofence boundaries, enrollment requirements,
    and session activity status.
    """
    def setUp(self):
        self.client = APIClient()
        self.lecturer = User.objects.create(name="Lecturer", email="lecturer@test.com", role="lecturer")
        self.student = User.objects.create(name="Student", email="student@test.com", role="student")
        self.course = Course.objects.create(title="History", description="Desc", lecturer=self.lecturer)
        Enrollment.objects.create(student=self.student, course=self.course)
        self.session = GeofenceSession.objects.create(course=self.course, lecturer=self.lecturer,
                                                      latitude=0, longitude=0, radius_meters=100,
                                                      start_time=timezone.now())

    def test_access_inside_geofence_allowed(self):
        #Ensure students inside geofence gain access
        url = reverse("geofence-check-access")
        data = {"course_id": self.course.id, "latitude": 0, "longitude": 0, "student": self.student.id}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.json()["allowed"])

    def test_access_outside_geofence_denied(self):
        #Ensure students outside geofence are denied access
        url = reverse("geofence-check-access")
        data = {"course_id": self.course.id, "latitude": 10.0, "longitude": 10.0, "student": self.student.id}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.json()["allowed"])
        self.assertIn("Distance", response.json()["note"])

    def test_access_not_enrolled_denied(self):
        #Ensure unenrolled students cannot join sessions
        outsider = User.objects.create(name="Outsider", email="outsider@test.com", role="student")
        url = reverse("geofence-check-access")
        data = {"course_id": self.course.id, "latitude": 0, "longitude": 0, "student": outsider.id}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.json()["reason"], "Not enrolled")

    def test_access_no_active_session(self):
        #Ensure access is denied if no session is active
        GeofenceSession.objects.all().update(is_active=False)
        url = reverse("geofence-check-access")
        data = {"course_id": self.course.id, "latitude": 0, "longitude": 0, "student": self.student.id}
        response = self.client.post(url, data, format="json")
        self.assertFalse(response.json()["allowed"])
        self.assertIn("No active geofence session", response.json()["note"])
