from django.test import TestCase
from django.test import Client
from .models import User
import bcrypt

class SecurityTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user_data = {
            'name': 'Test User',
            'email': 'test@example.com',
            'password': 'securepassword123',
            'role': 'student'
        }
        
    def test_password_hashing(self):
        """Test that passwords are properly hashed"""
        user = User.objects.create(
            name=self.user_data['name'],
            email=self.user_data['email'],
            role=self.user_data['role']
        )
        user.set_password(self.user_data['password'])
        user.save()
        
        # Refresh user from database
        user.refresh_from_db()
        
        # Verify password is hashed
        self.assertTrue(user.password.startswith('$2b$'))
        self.assertTrue(user.check_password(self.user_data['password']))
        self.assertFalse(user.check_password('wrongpassword'))
    
    def test_plain_text_password_migration(self):
        """Test that plain text passwords get migrated to hashes on login"""
        # Create user with plain text password
        user = User.objects.create(
            name='Plain Text User',
            email='plain@example.com',
            password='plaintext123',  # Plain text
            role='student'
        )
        
        # Check that password starts as plain text
        self.assertEqual(user.password, 'plaintext123')
        
        # Simulate login - this should migrate to hash
        result = user.check_password('plaintext123')
        
        # Refresh user to get updated password from DB
        user.refresh_from_db()
        
        # Verify password was migrated to hash
        self.assertTrue(user.password.startswith('$2b$'))
        self.assertTrue(result)
        self.assertTrue(user.check_password('plaintext123'))  # Should still work
    
    def test_password_migration_method(self):
        """Test the password migration class method"""
        # Create users with plain text passwords
        user1 = User.objects.create(
            name='User 1',
            email='user1@example.com',
            password='password1',  # Plain text
            role='student'
        )
        user2 = User.objects.create(
            name='User 2', 
            email='user2@example.com',
            password='password2',  # Plain text
            role='lecturer'
        )
        
        # Run migration
        migrated_count = User.migrate_all_passwords()
        
        # Refresh users
        user1.refresh_from_db()
        user2.refresh_from_db()
        
        # Verify passwords are now hashed
        self.assertTrue(user1.password.startswith('$2b$'))
        self.assertTrue(user2.password.startswith('$2b$'))
        self.assertEqual(migrated_count, 2)
        
        # Verify passwords still work
        self.assertTrue(user1.check_password('password1'))
        self.assertTrue(user2.check_password('password2'))
    
    def test_sql_injection_protection(self):
        """Test SQL injection protection"""
        # Attempt SQL injection in email field
        injection_attempt = "test' OR '1'='1"
        response = self.client.post('/accounts/login/', {
            'email': injection_attempt,
            'password': 'anypassword'
        })
        
        # Should not crash and should return proper error
        self.assertNotEqual(response.status_code, 500)
    
    def test_secure_login(self):
        """Test secure login functionality"""
        # Create user first with hashed password
        user = User.objects.create(
            name=self.user_data['name'],
            email=self.user_data['email'],
            role=self.user_data['role']
        )
        user.set_password(self.user_data['password'])
        user.save()
        
        # Test successful login
        response = self.client.post('/accounts/login/', {
            'email': self.user_data['email'],
            'password': self.user_data['password']
        })
        
        self.assertEqual(response.status_code, 200)
        self.assertIn('id', response.data)
        self.assertNotIn('password', response.data)  # Sensitive data hidden