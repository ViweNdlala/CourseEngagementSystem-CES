from django.test import TestCase, Client
from .models import User
import bcrypt

class SecurityTests(TestCase):
    """
    TestCase class for security-related tests for the User model.
    Includes tests for password hashing, plain text password migration,
    SQL injection protection, and secure login functionality.
    """

    def setUp(self):
        """
        Set up test environment.
        Creates a test client and sample user data for use in tests.
        """
        self.client = Client()
        self.user_data = {
            'name': 'Test User',
            'email': 'test@example.com',
            'password': 'securepassword123',
            'role': 'student'
        }

    def test_password_hashing(self):
        """
        Test that passwords are properly hashed when set.
        Verifies that the hashed password starts with bcrypt prefix
        and check_password works correctly.
        """
        user = User.objects.create(
            name=self.user_data['name'],
            email=self.user_data['email'],
            role=self.user_data['role']
        )
        user.set_password(self.user_data['password'])
        user.save()

        # Refresh user from database
        user.refresh_from_db()

        # Verify password is hashed and check_password works
        self.assertTrue(user.password.startswith('$2b$'))
        self.assertTrue(user.check_password(self.user_data['password']))
        self.assertFalse(user.check_password('wrongpassword'))

    def test_plain_text_password_migration(self):
        """
        Test that plain text passwords get migrated to hashed passwords
        when check_password is called (simulated login).
        """
        # Create user with plain text password
        user = User.objects.create(
            name='Plain Text User',
            email='plain@example.com',
            password='plaintext123',
            role='student'
        )

        # Confirm password is initially plain text
        self.assertEqual(user.password, 'plaintext123')

        # Simulate login (triggers migration to hashed password)
        result = user.check_password('plaintext123')

        # Refresh user from database
        user.refresh_from_db()

        # Verify password is now hashed and login works
        self.assertTrue(user.password.startswith('$2b$'))
        self.assertTrue(result)
        self.assertTrue(user.check_password('plaintext123'))

    def test_password_migration_method(self):
        """
        Test the User model's class method for migrating all plain text
        passwords to hashed passwords.
        """
        # Create multiple users with plain text passwords
        user1 = User.objects.create(
            name='User 1',
            email='user1@example.com',
            password='password1',
            role='student'
        )
        user2 = User.objects.create(
            name='User 2',
            email='user2@example.com',
            password='password2',
            role='lecturer'
        )

        # Run migration
        migrated_count = User.migrate_all_passwords()

        # Refresh users
        user1.refresh_from_db()
        user2.refresh_from_db()

        # Verify passwords are hashed and migration count is correct
        self.assertTrue(user1.password.startswith('$2b$'))
        self.assertTrue(user2.password.startswith('$2b$'))
        self.assertEqual(migrated_count, 2)

        # Verify passwords still work after migration
        self.assertTrue(user1.check_password('password1'))
        self.assertTrue(user2.check_password('password2'))

    def test_sql_injection_protection(self):
        """
        Test that SQL injection attempts in the login form are safely handled.
        The application should not crash and should return a proper error response.
        """
        injection_attempt = "test' OR '1'='1"
        response = self.client.post('/accounts/login/', {
            'email': injection_attempt,
            'password': 'anypassword'
        })

        # Ensure server does not return 500 error
        self.assertNotEqual(response.status_code, 500)

    def test_secure_login(self):
        """
        Test secure login functionality.
        Verifies that users can login with correct credentials and that
        sensitive information like passwords is not returned in the response.
        """
        # Create user with hashed password
        user = User.objects.create(
            name=self.user_data['name'],
            email=self.user_data['email'],
            role=self.user_data['role']
        )
        user.set_password(self.user_data['password'])
        user.save()

        # Attempt login
        response = self.client.post('/accounts/login/', {
            'email': self.user_data['email'],
            'password': self.user_data['password']
        })

        # Verify successful login
        self.assertEqual(response.status_code, 200)
        self.assertIn('id', response.data)
        self.assertNotIn('password', response.data)  # Ensure password is hidden
