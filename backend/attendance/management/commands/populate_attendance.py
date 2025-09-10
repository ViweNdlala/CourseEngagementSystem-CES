from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date, timedelta
from attendance.models import Attendance
from courses.models import Enrollment
from accounts.models import User


class Command(BaseCommand):
    help = 'Populate attendance records with sample data'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--sessions',
            type=int,
            default=10,
            help='Number of lecture sessions to create (default: 10)'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing attendance records before creating new ones'
        )
    
    def handle(self, *args, **options):
        sessions = options['sessions']
        clear_existing = options['clear']
        
        if clear_existing:
            self.stdout.write('Clearing existing attendance records...')
            Attendance.objects.all().delete()
            self.stdout.write(self.style.WARNING('Existing attendance records cleared.'))
        
        # Get enrollments for CSC1010H (Course ID: 1)
        course_enrollments = Enrollment.objects.filter(course__id=1).select_related('student', 'course')
        
        if not course_enrollments.exists():
            self.stdout.write(self.style.ERROR('No enrollments found for course CSC1010H (ID: 1)'))
            return
        
        self.stdout.write(f'Found {course_enrollments.count()} enrollments for CSC1010H')
        
        # Create attendance records for the past 10 lecture days
        # We'll use the past 10 weekdays (Monday to Friday) as lecture days
        lecture_dates = []
        current_date = date.today()
        days_added = 0
        days_back = 0
        
        while days_added < sessions:
            check_date = current_date - timedelta(days=days_back)
            # Only add weekdays (Monday=0, Sunday=6)
            if check_date.weekday() < 5:  # Monday to Friday
                lecture_dates.append(check_date)
                days_added += 1
            days_back += 1
        
        # Reverse to get chronological order (oldest first)
        lecture_dates.reverse()
        
        self.stdout.write(f'Creating attendance for {sessions} lecture sessions...')
        
        created_count = 0
        
        for enrollment in course_enrollments:
            student_name = enrollment.student.name
            
            # Define attendance patterns based on requirements
            if student_name.lower() == 'james':
                # James: 8 out of 10 attendance (80%)
                absent_sessions = [2, 7]  # Will be absent on sessions 3 and 8 (0-indexed: 2, 7)
                self.stdout.write(f'Creating attendance for {student_name} (8/10 pattern)...')
            elif student_name.lower() == 'xabiso':
                # Xabiso: 10 out of 10 attendance (100%)
                absent_sessions = []  # Never absent
                self.stdout.write(f'Creating attendance for {student_name} (10/10 pattern)...')
            else:
                # For any other students, give them random good attendance
                absent_sessions = [1, 8]  # Decent attendance
                self.stdout.write(f'Creating attendance for {student_name} (default pattern)...')
            
            for i, lecture_date in enumerate(lecture_dates):
                # Check if attendance already exists
                existing_attendance = Attendance.objects.filter(
                    enrollment=enrollment,
                    date=lecture_date
                ).first()
                
                if existing_attendance:
                    self.stdout.write(f'  Attendance already exists for {student_name} on {lecture_date}')
                    continue
                
                # Determine if student is present or absent
                status = 'absent' if i in absent_sessions else 'present'
                
                # Create attendance record
                attendance = Attendance.objects.create(
                    enrollment=enrollment,
                    date=lecture_date,
                    status=status
                )
                
                created_count += 1
                self.stdout.write(f'  {lecture_date}: {student_name} - {status}')
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\nSuccessfully created {created_count} attendance records!\n'
            )
        )
        
        # Display summary statistics
        self.display_summary()
    
    def display_summary(self):
        """Display attendance summary for each student"""
        self.stdout.write(self.style.SUCCESS('=== ATTENDANCE SUMMARY ==='))
        
        enrollments = Enrollment.objects.filter(course__id=1).select_related('student', 'course')
        
        for enrollment in enrollments:
            attendance_records = Attendance.objects.filter(enrollment=enrollment)
            total_sessions = attendance_records.count()
            present_count = attendance_records.filter(status='present').count()
            absent_count = total_sessions - present_count
            percentage = round((present_count / total_sessions * 100), 2) if total_sessions > 0 else 0
            
            self.stdout.write(
                f'Student: {enrollment.student.name}\n'
                f'  Course: {enrollment.course.title}\n'
                f'  Present: {present_count}/{total_sessions} ({percentage}%)\n'
                f'  Absent: {absent_count}\n'
            )
