from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Attendance
from .serializers import LecturerAttendanceSerializer
from courses.models import Enrollment
from accounts.models import User
from datetime import date
from django.db import transaction

class StudentAttendanceView(APIView):
    """
    API view for student attendance operations.
    
    Handles attendance marking and retrieval for students,
    with automatic absent record creation for all enrolled students.
    """    
    def _create_absent_records_for_all_students(self, course, attendance_date):
        """
        Initialize attendance records for all enrolled students as 'absent'.

        Called when first student marks attendance for a course on a specific date.
        Uses bulk_create for efficiency with large enrollments.
        """
        enrollments = Enrollment.objects.filter(course=course)
        attendance_records = []
        
        for enrollment in enrollments:
            # Skip if attendance record already exists
            if not Attendance.objects.filter(enrollment=enrollment, date=attendance_date).exists():
                attendance_records.append(
                    Attendance(
                        enrollment=enrollment,
                        date=attendance_date,
                        status='absent'
                    )
                )
        
        if attendance_records:
            Attendance.objects.bulk_create(attendance_records)

    def get(self, request):
        """
        Retrieve student attendance records.
        
        Returns specific course attendance if course_id provided,
        otherwise returns attendance summary across all courses.
        """
        id = request.query_params.get('id')
        course_id = request.query_params.get('course_id')
        
        if not id:
            return Response({"error": "id parameter is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            student = User.objects.get(id=id, role='student')
        except User.DoesNotExist:
            return Response({"error": "Student not found"}, status=status.HTTP_404_NOT_FOUND)
        
        all_attendance_records = Attendance.objects.filter(enrollment__student__id=id).order_by('-date')
        
        if course_id:
            try:
                enrollment = Enrollment.objects.get(student__id=id, course__id=course_id)
            except Enrollment.DoesNotExist:
                return Response({"error": "Student is not enrolled in this course"}, status=status.HTTP_400_BAD_REQUEST)
            
            course_attendance_records = Attendance.objects.filter(enrollment=enrollment).order_by('-date')
            
            data = [
                {
                    "id": record.id,
                    "date": record.date,
                    "status": record.status,
                }
                for record in course_attendance_records
            ]
            
            return Response(data)
        
        else:
            # Return attendance summary across all enrolled courses
            course_summaries = {}
            
            for record in all_attendance_records:
                course_title = record.enrollment.course.title
                course_id = record.enrollment.course.id
                
                # Calculate attendance stats per course
                if course_id not in course_summaries:
                    course_records = all_attendance_records.filter(enrollment__course__id=course_id)
                    total_attendances = course_records.count()
                    attended = course_records.filter(status='present').count()
                    course_percentage = round((attended / total_attendances * 100)) if total_attendances > 0 else 0
                    
                    course_summaries[course_id] = {
                        "course": course_title,
                        "attended": attended,
                        "attendance_percentage": course_percentage
                    }            
            return Response({
                "student_name": student.name,
                "courses": list(course_summaries.values())
            })
    
    def post(self, request):
        """
        Mark student attendance for a specific date.
        
        Creates absent records for all students if this is the first
        attendance marked for the course on a specific date.
        """
        enrollment_id = request.data.get('enrollment')
        attendance_date_str = request.data.get('date')
        attendance_status = request.data.get('status', 'present')
        
        if not enrollment_id:
            return Response({"error": "enrollment field is required"}, status=status.HTTP_400_BAD_REQUEST)
        if not attendance_date_str:
            return Response({"error": "date field is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            # Parse date string to date object
            if isinstance(attendance_date_str, str):
                attendance_date = date.fromisoformat(attendance_date_str)
            else:
                attendance_date = attendance_date_str
                
            enrollment = Enrollment.objects.get(id=enrollment_id)
        except (ValueError, Enrollment.DoesNotExist) as e:
            return Response({"error": "Invalid enrollment or date"}, status=status.HTTP_400_BAD_REQUEST)
            
        course = enrollment.course
        
        # Use transaction to ensure data consistency
        with transaction.atomic():
            # Check if there are any attendance records for this course/date
            existing_records = Attendance.objects.filter(
                enrollment__course=course, 
                date=attendance_date
            )
            
            if not existing_records.exists():
                self._create_absent_records_for_all_students(course, attendance_date)
            
            # Get or update the student's specific record
            attendance_record, created = Attendance.objects.get_or_create(
                enrollment=enrollment,
                date=attendance_date,
                defaults={'status': attendance_status}
            )
            
            if not created:
                # Record existed (was 'absent'), update to 'present'
                attendance_record.status = attendance_status
                attendance_record.save()
            
            response_data = {
                "id": attendance_record.id,
                "date": attendance_record.date,
                "course_title": attendance_record.enrollment.course.title,
                "status": attendance_record.status,
                "marked_at": attendance_record.marked_at
            }
            return Response(response_data, status=status.HTTP_201_CREATED)


class LecturerAttendanceView(APIView):
    """
    API view for lecturer attendance operations.
    
    Provides read-only access to attendance data for courses
    taught by the lecturer. Lecturers cannot mark attendance.
    """
    serializer_class = LecturerAttendanceSerializer

    def get(self, request):
        """Retrieve attendance statistics and records for lecturer's courses."""
        id = request.query_params.get('id')
        if not id:
            return Response({"error": "id parameter is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            lecturer = User.objects.get(id=id, role='lecturer')
        except User.DoesNotExist:
            return Response({"error": "Lecturer not found"}, status=status.HTTP_404_NOT_FOUND)
        
        attendance_records = Attendance.objects.filter(
            enrollment__course__lecturer__id=id
        ).order_by('-date', 'enrollment__student__name')

        # Calculate overall attendance statistics
        total = attendance_records.count()
        present_count = attendance_records.filter(status='present').count()
        attendance_percentage = round((present_count / total * 100)) if total > 0 else 0

        # Format attendance data for response
        attendance_data = [
            {
                "date": record.date,
                "student_email": record.enrollment.student.email,
                "student_name": record.enrollment.student.name,
                "status": record.status,
                "course_title": record.enrollment.course.title,
                "course_id": record.enrollment.course.id,
            }
            for record in attendance_records
        ]
        
        return Response({
            "lecturer_name": lecturer.name,
            "course_title": attendance_records.first().enrollment.course.title,
            "attendance_percentage": attendance_percentage,
            "attendance_records": attendance_data
        })
    
    def post(self, request):
        return Response({"error": "Lecturers cannot mark attendance."}, status=status.HTTP_405_METHOD_NOT_ALLOWED)
