from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import User
from courses.models import Course, Enrollment
from .models import PointRequest, Leaderboard


# Models tests
class PointRequestModelTest(TestCase):
    def setUp(self):
        self.student = User.objects.create(name="Student 1", email="stud1@test.com")
        self.course = Course.objects.create(title="Math", description="Basics", lecturer=self.student)

    def test_points_auto_set(self):
        #Verify automatic points assignment works for both request types.
        pr_question = PointRequest.objects.create(
            student=self.student, course=self.course, request_type="question", description="Q1", session_id=1
        )
        pr_answer = PointRequest.objects.create(
            student=self.student, course=self.course, request_type="answer", description="A1", session_id=2
        )
        self.assertEqual(pr_question.points, 10)
        self.assertEqual(pr_answer.points, 20)

    def test_points_not_overwritten_if_set(self):
        #If points are explicitly provided, they should not be auto-overwritten.
        pr = PointRequest.objects.create(
            student=self.student, course=self.course,
            request_type="question", description="Custom points", session_id=3, points=50
        )
        self.assertEqual(pr.points, 50)

    def test_str_representation(self):
        pr = PointRequest.objects.create(
            student=self.student, course=self.course, request_type="question", description="Q2", session_id=4
        )
        self.assertIn("PointRequest", str(pr))



# API test
class PointRequestAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.lecturer = User.objects.create(name="Lecturer", email="lecturer@test.com")
        self.student = User.objects.create(name="Student", email="student@test.com")
        self.course = Course.objects.create(title="Science", description="Desc", lecturer=self.lecturer)

    def _create_point_request(self, **kwargs):
        #Helper to create a point request via API.
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

    def test_create_point_request_success(self):
        response = self._create_point_request()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        pr = PointRequest.objects.get(student=self.student, course=self.course, session_id=1)
        self.assertEqual(pr.points, 10)

    def test_create_point_request_missing_description(self):
        #Should fail if description is empty.
        response = self._create_point_request(description="")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("description", response.json())

    def test_cannot_exceed_two_requests_per_session(self):
        self._create_point_request(session_id=99)
        self._create_point_request(session_id=99)
        response = self._create_point_request(session_id=99)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_approve_point_request_success(self):
        pr = PointRequest.objects.create(
            student=self.student, course=self.course,
            request_type="answer", description="Answer", session_id=2
        )
        url = reverse("approve-point-request", args=[pr.id])
        response = self.client.post(url, {"lecturer": self.lecturer.id}, format="json")
        self.assertEqual(response.status_code, 200)
        pr.refresh_from_db()
        self.assertTrue(pr.approved)
        leaderboard = Leaderboard.objects.get(student=self.student, course=self.course)
        self.assertEqual(leaderboard.total_points, 20)

    def test_approve_point_request_wrong_lecturer_denied(self):
        #Another lecturer cannot approve.
        other = User.objects.create(name="Other", email="other@test.com")
        pr = PointRequest.objects.create(
            student=self.student, course=self.course,
            request_type="question", description="Qx", session_id=10
        )
        url = reverse("approve-point-request", args=[pr.id])
        response = self.client.post(url, {"lecturer": other.id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.json())

    def test_decline_point_request(self):
        pr = PointRequest.objects.create(
            student=self.student, course=self.course,
            request_type="question", description="Decline", session_id=3
        )
        url = reverse("decline-point-request", args=[pr.id])
        response = self.client.post(url, {"lecturer": self.lecturer.id}, format="json")
        self.assertEqual(response.status_code, 200)
        pr.refresh_from_db()
        self.assertTrue(pr.declined)

    def test_mark_notified(self):
        pr = PointRequest.objects.create(
            student=self.student, course=self.course, request_type="question",
            description="Notify", session_id=4
        )
        url = reverse("mark-notified")
        response = self.client.patch(url, {"ids": [pr.id]}, format="json")
        self.assertEqual(response.status_code, 200)
        pr.refresh_from_db()
        self.assertTrue(pr.is_notified)
        self.assertTrue(pr.notification_pending)

    def test_dismiss_notification(self):
        pr = PointRequest.objects.create(
            student=self.student, course=self.course, request_type="question",
            description="Dismiss", session_id=5, is_notified=True, notification_pending=True
        )
        url = reverse("dismiss-notification", args=[pr.id])
        response = self.client.patch(url, {}, format="json")
        self.assertEqual(response.status_code, 200)
        pr.refresh_from_db()
        self.assertFalse(pr.notification_pending)



# Students without points test
class StudentsWithoutPointsViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.lecturer = User.objects.create(name="Lecturer", email="lecturer@test.com")
        self.student = User.objects.create(name="Student", email="student@test.com")
        self.course = Course.objects.create(title="History", description="Desc", lecturer=self.lecturer)
        Enrollment.objects.create(student=self.student, course=self.course)

    def test_students_without_points(self):
        url = reverse("students-without-points")
        params = {"lecturer_id": self.lecturer.id, "course_id": self.course.id}
        response = self.client.get(url, params)
        self.assertEqual(response.status_code, 200)
        data = response.json()["students_without_points"]
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["id"], self.student.id)

    def test_students_without_points_invalid_course(self):
        url = reverse("students-without-points")
        params = {"lecturer_id": self.lecturer.id, "course_id": 999}
        response = self.client.get(url, params)
        self.assertEqual(response.status_code, 404)


# Leaderboard test
class LeaderboardViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.lecturer = User.objects.create(name="Lecturer", email="lecturer@test.com")
        self.student = User.objects.create(name="Student", email="student@test.com")
        self.course = Course.objects.create(title="Biology", description="Desc", lecturer=self.lecturer)
        self.lb = Leaderboard.objects.create(student=self.student, course=self.course, total_points=30)

    def test_leaderboard_list(self):
        url = reverse("leaderboard")
        response = self.client.get(url, {"course": self.course.id})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["student"], self.student.id)
        self.assertEqual(data[0]["total_points"], 30)
