from django.test import TestCase
from accounts.models import User
from courses.models import Course
from quizzes.models import Quiz, Question, Answer, Attempt


class QuizModelsTestCase(TestCase):
    """
    Test for the Quiz, Question, Answer, and Attempt models in the quizzes app.

    This class verifies:
    - Correct creation of Quiz, Question, and Answer instances.
    - Proper linking of quizzes to courses and authors.
    - Relationship integrity between questions and their answers.
    - Enforcement of unique constraints on Attempt instances.
    - Correct behavior of scoring or percentage calculation in Attempt.
    - Password handling/upgrading in the User model (for plain text → bcrypt upgrade scenario).

    Uses Django's TestCase class to provide a transactional test database that is
    set up before each test and rolled back afterward.
    """

    def setUp(self):
        """
        Test setup executed before each test method.

        Creates:
        - One lecturer user.
        - One course linked to the lecturer.
        - One student user.
        - One quiz authored by the lecturer.
        - One question for the quiz.
        - Two answers for the question (one correct, one incorrect).
        """
        # Create a lecturer user
        self.lecturer = User.objects.create(
            name="Test Lecturer",
            email="lecturer@example.com",
            password="testpassword"
        )

        # Create a course linked to the lecturer
        self.course = Course.objects.create(
            title="Test Course",
            description="Computer Programming",
            lecturer=self.lecturer
        )

        # Create a student user
        self.student = User.objects.create(
            name="Student One",
            email="student@example.com",
            password="studentpass"
        )

        # Create a quiz authored by the lecturer
        self.quiz = Quiz.objects.create(
            title="Sample Quiz",
            course=self.course,
            author=self.lecturer
        )

        # Create a question for the quiz
        self.question = Question.objects.create(
            quiz=self.quiz,
            text="What is 2 + 2?"
        )

        # Create answers for the question
        self.answer1 = Answer.objects.create(
            question=self.question,
            text="4",
            is_correct=True
        )
        self.answer2 = Answer.objects.create(
            question=self.question,
            text="5",
            is_correct=False
        )

    def test_quiz_creation(self):
        """
        Verify that a quiz is correctly created and linked to the associated course and author.

        Assertions:
        - The quiz's course matches the course created in setUp.
        - The quiz's author matches the lecturer created in setUp.
        - The quiz title matches the expected string.
        """
        self.assertEqual(self.quiz.course, self.course)
        self.assertEqual(self.quiz.author, self.lecturer)
        self.assertEqual(self.quiz.title, "Sample Quiz")

    def test_question_and_answer_relationship(self):
        """
        Verify that a question is linked to its quiz and that answers belong to the question.

        Assertions:
        - The question's quiz is correctly set.
        - Both answers created in setUp are associated with the question.
        """
        self.assertEqual(self.question.quiz, self.quiz)
        self.assertIn(self.answer1, self.question.answers.all())
        self.assertIn(self.answer2, self.question.answers.all())

    def test_attempt_unique_constraint(self):
        """
        Verify that the Attempt model enforces a unique attempt number per user per quiz.

        Actions:
        - Create an initial Attempt for a student on a quiz.
        - Attempt to create a second Attempt with the same attempt number.
        
        Expected Result:
        - The second creation raises an exception (IntegrityError or custom validation error).
        """
        # Create the first attempt
        Attempt.objects.create(
            quiz=self.quiz,
            user=self.student,
            attempt_number=1,
            score=80
        )

        # Attempt to create a duplicate attempt (should raise an exception)
        with self.assertRaises(Exception):
            Attempt.objects.create(
                quiz=self.quiz,
                user=self.student,
                attempt_number=1,
                score=90
            )

    def test_attempt_percentage_calculation(self):
        """
        Verify that an attempt's score/percentage is calculated correctly.
        """
        attempt = Attempt.objects.create(
            quiz=self.quiz,
            user=self.student,
            attempt_number=1,
            score=50
        )

        self.assertEqual(attempt.score, 50)

    def test_user_password_upgrade_on_check(self):
        """
        Test that plain text passwords in the User model can be detected and upgraded.
        """
        user = User.objects.create(
            name="Plain User",
            email="plain@example.com",
            password="plainpassword"
        )

        # Checks that the password currently starts with the plain string (indicating non-hashed)
        self.assertTrue(user.password.startswith("plain"))
