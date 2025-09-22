from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import User
from courses.models import Course, Enrollment
from .models import PointRequest, Leaderboard



# MODEL TESTS

class PointRequestModelTest(TestCase):
    """Tests for PointRequest model behavior."""

    def setUp(self):
        self.student = User.objects.create(name="Student 1", email="stud1@test.com")
        self.course = Course.objects.create(title="Math", description="Basics", lecturer=self.student)

    def test_points_auto_set(self):
        """Verify automatic points assignment based on request type."""
        pr_question = PointRequest.objects.create(
            student=self.student, course=self.course, request_type="question", description="Q1", session_id=1
        )
        pr_answer = PointRequest.objects.create(
            student=self.student, course=self.course, request_type="answer", description="A1", session_id=2
        )
        self.assertEqual(pr_question.points, 10)
        self.assertEqual(pr_answer.points, 20)

    def test_str_representation(self):
        """Ensure __str__ returns a string containing 'PointRequest'."""
        pr = PointRequest.objects.create(
            student=self.student, course=self.course, request_type="question", description="Q2", session_id=3
        )
        self.assertIn("PointRequest", str(pr))



# API TESTS

class PointRequestAPITest(TestCase):
    """Tests for PointRequest API endpoints."""

    def setUp(self):
        self.client = APIClient()
        self.lecturer = User.objects.create(name="Lecturer", email="lecturer@test.com")
        self.student = User.objects.create(name="Student", email="student@test.com")
        self.course = Course.objects.create(title="Science", description="Desc", lecturer=self.lecturer)

    def _create_point_request(self, **kwargs):
        """Helper to create a point request via API."""
        url = reverse("point-requests")
        data = {
            "student": self.student.id,
            "course": self.course.id,
            "request_type": "question",
            "description": "Test request",
            "session_id": 1,
        }
        data.update(kwargs)
        return self.client.post(url, data, format="json")

    def test_create_point_request(self):
        """Test creating a point request assigns correct points."""
        response = self._create_point_request()
        if response.status_code != status.HTTP_201_CREATED:
            print("DEBUG response:", response.status_code, response.json())
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        pr = PointRequest.objects.get(student=self.student, course=self.course, session_id=1)
        self.assertEqual(pr.points, 10)
        self.assertEqual(pr.request_type, "question")

    def test_cannot_exceed_two_requests_per_session(self):
        """Ensure no more than 2 requests per session per student."""
        self._create_point_request(session_id=99)
        self._create_point_request(session_id=99)
        response = self._create_point_request(session_id=99)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_approve_point_request(self):
        """Approving a request updates approval and leaderboard."""
        pr = PointRequest.objects.create(
            student=self.student, course=self.course, request_type="answer", description="Answer", session_id=2
        )
        url = reverse("approve-point-request", args=[pr.id])
        response = self.client.post(url, {"lecturer": self.lecturer.id}, format="json")
        self.assertEqual(response.status_code, 200)
        pr.refresh_from_db()
        self.assertTrue(pr.approved)
        leaderboard = Leaderboard.objects.get(student=self.student)
        self.assertEqual(leaderboard.total_points, 20)

    def test_decline_point_request(self):
        """Declining a request marks it declined."""
        pr = PointRequest.objects.create(
            student=self.student, course=self.course, request_type="question", description="Decline", session_id=3
        )
        url = reverse("decline-point-request", args=[pr.id])
        response = self.client.post(url, {"lecturer": self.lecturer.id}, format="json")
        self.assertEqual(response.status_code, 200)
        pr.refresh_from_db()
        self.assertTrue(pr.declined)

    def test_mark_notified(self):
        """Marking notifications sets flags correctly."""
        pr = PointRequest.objects.create(
            student=self.student, course=self.course, request_type="question", description="Notify", session_id=4
        )
        url = reverse("mark-notified")
        response = self.client.patch(url, {"ids": [pr.id]}, format="json")
        self.assertEqual(response.status_code, 200)
        pr.refresh_from_db()
        self.assertTrue(pr.is_notified)
        self.assertTrue(pr.notification_pending)

    def test_dismiss_notification(self):
        """Dismissing notifications clears the pending flag."""
        pr = PointRequest.objects.create(
            student=self.student, course=self.course, request_type="question",
            description="Dismiss", session_id=5, is_notified=True, notification_pending=True
        )
        url = reverse("dismiss-notification", args=[pr.id])
        response = self.client.patch(url, {}, format="json")
        self.assertEqual(response.status_code, 200)
        pr.refresh_from_db()
        self.assertFalse(pr.notification_pending)



# STUDENTS WITHOUT POINTS TEST

class StudentsWithoutPointsViewTest(TestCase):
    """Tests for retrieving students without points."""

    def setUp(self):
        self.client = APIClient()
        self.lecturer = User.objects.create(name="Lecturer", email="lecturer@test.com")
        self.student = User.objects.create(name="Student", email="student@test.com")
        self.course = Course.objects.create(title="History", description="Desc", lecturer=self.lecturer)
        Enrollment.objects.create(student=self.student, course=self.course)

    def test_students_without_points(self):
        """Ensure students without points are listed correctly."""
        url = reverse("students-without-points")
        params = {"lecturer_id": self.lecturer.id, "course_id": self.course.id}
        response = self.client.get(url, params)
        self.assertEqual(response.status_code, 200)
        data = response.json()["students_without_points"]
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["id"], self.student.id)
