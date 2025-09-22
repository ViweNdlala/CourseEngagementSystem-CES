from rest_framework.test import APITestCase
from rest_framework import status
from accounts.models import User
from courses.models import Course
from .models import PreparationWeek, PreparationResource

class PreparationViewsTestCase(APITestCase):
    """Test cases for Preparation API views following Django best practices."""
    
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
        self.week = PreparationWeek.objects.create(
            course=self.course,
            week_number=1,
            welcome_message="Welcome to week 1!"
        )
        self.resource = PreparationResource.objects.create(
            week=self.week,
            title="Test Resource",
            url="https://example.com/test-resource"
        )

    def test_preparation_week_post(self):
        """Test POST request to create a new preparation week."""
        url = f'/courses/{self.course.id}/preparation/weeks/'
        data = {
            'week_number': 2,
            'welcome_message': 'Welcome to week 2!'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify the week was created
        week = PreparationWeek.objects.get(course=self.course, week_number=2)
        self.assertEqual(week.welcome_message, 'Welcome to week 2!')

    def test_preparation_week_post_duplicate(self):
        """Test POST request with duplicate week number."""
        url = f'/courses/{self.course.id}/preparation/weeks/'
        data = {
            'week_number': 1,
            'welcome_message': 'Duplicate week'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_preparation_week_list_get(self):
        """Test GET request to PreparationWeekListView."""
        url = f'/courses/{self.course.id}/preparation/weeks/'
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['week_number'], 1)
        self.assertEqual(data[0]['welcome_message'], "Welcome to week 1!")

    def test_preparation_specific_week_get(self):
        """Test GET request to PreparationWeekDetailView."""
        url = f'/courses/{self.course.id}/preparation/weeks/{self.week.id}/'
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.json()
        self.assertEqual(data['id'], self.week.id)
        self.assertEqual(data['week_number'], self.week.week_number)

    def test_preparation_week_update(self):
        """Test PUT request to update a preparation week."""
        url = f'/courses/{self.course.id}/preparation/weeks/{self.week.id}/'
        data = {
            'course': self.course.id,
            'week_number': 1,
            'welcome_message': 'Updated welcome message!'
        }
        
        response = self.client.put(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify the update
        self.week.refresh_from_db()
        self.assertEqual(self.week.welcome_message, 'Updated welcome message!')

    def test_preparation_week_delete(self):
        """Test DELETE request to remove a preparation week."""
        url = f'/courses/{self.course.id}/preparation/weeks/{self.week.id}/'
        
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Verify the week was deleted
        with self.assertRaises(PreparationWeek.DoesNotExist):
            PreparationWeek.objects.get(id=self.week.id)

    def test_preparation_resource_get(self):
        """Test GET request to PreparationResourceListView."""
        url = f'/courses/{self.course.id}/preparation/weeks/{self.week.id}/resources/'
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['title'], "Test Resource")

    def test_preparation_resource_post(self):
        """Test POST request to create a new resource."""
        url = f'/courses/{self.course.id}/preparation/weeks/{self.week.id}/resources/'
        data = {
            'title': 'New Resource',
            'url': 'https://example.com/new-resource'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify the resource was created
        resource = PreparationResource.objects.get(week=self.week, title='New Resource')
        self.assertEqual(resource.url, 'https://example.com/new-resource')
