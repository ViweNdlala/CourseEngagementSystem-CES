from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status
from datetime import timedelta
from accounts.models import User
from courses.models import Course, Enrollment
from attendance.models import Attendance

class AttendanceViewsTestCase(APITestCase):
    """Test cases for Attendance API views"""
    def setUp(self):
        """Set up test data for API tests."""
        self.lecturer = User.objects.create(
            name="Dr. Test Lecturer",
            email="lecturer@test.com",
            password="testpass123",
            role="lecturer"
        )
        self.student = User.objects.create(
            name="Test Student",
            email="student@test.com",
            password="testpass123",
            role="student"
        )
        self.course = Course.objects.create(
            title="Test Course",
            description="A course for testing",
            lecturer=self.lecturer
        )
        self.enrollment = Enrollment.objects.create(
            student=self.student,
            course=self.course
        )
        self.attendance = Attendance.objects.create(
            enrollment=self.enrollment,
            date=timezone.now().date(),
            status="present"
        )

    def test_student_get(self):
        """Test GET request to StudentAttendanceView."""
        url = f'/attendance/student/?id={self.student.id}&course_id={self.course.id}'
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['status'], 'present')

    def test_student_does_not_exist(self):
        """Test GET request for student that doesnt exist."""
        url = f'/attendance/student/?id=99999&course_id={self.course.id}'
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_student_post(self):
        """Test POST request to create attendance record via student view."""
        url = f'/attendance/student/'
        data = {
            'enrollment': self.enrollment.id,
            'date': str(timezone.now().date() + timedelta(days=1)),
            'status': 'present'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify attendance was created
        attendance = Attendance.objects.get(
            enrollment=self.enrollment,
            date=timezone.now().date() + timedelta(days=1)
        )
        self.assertEqual(attendance.status, 'present')

    def test_lecturer_get(self):
        """Test GET request to LecturerAttendanceView."""
        url = f'/attendance/lecturer/?id={self.lecturer.id}'
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.json()
        self.assertIn('attendance_records', data)
        self.assertEqual(len(data['attendance_records']), 1)

    def test_lecturer_post(self):
        """Test POST request to create attendance record."""
        url = f'/attendance/lecturer/'
        data = {
            'enrollment': self.enrollment.id,
            'date': str(timezone.now().date() + timedelta(days=1)),
            'status': 'absent'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_lecturer_delete(self):
        """Test DELETE request - not supported by the API. Should return 404."""
        url = f'/attendance/lecturer/{self.attendance.id}/'
        
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
