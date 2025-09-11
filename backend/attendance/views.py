from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Attendance
from .serializers import StudentAttendanceSerializer, LecturerAttendanceSerializer
from courses.models import Enrollment, Course
from accounts.models import User
from datetime import date


class StudentAttendanceView(APIView):
    serializer_class = StudentAttendanceSerializer

    def get(self, request):
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
            course_summaries = {}
            
            for record in all_attendance_records:
                course_title = record.enrollment.course.title
                course_id = record.enrollment.course.id
                
                # Build course summaries
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
        
        serializer = StudentAttendanceSerializer(data=request.data)
        if serializer.is_valid():
            enrollment = serializer.validated_data['enrollment']
            attendance_date = serializer.validated_data['date']
            
            existing = Attendance.objects.filter(enrollment=enrollment, date=attendance_date).first()
            if existing:
                return Response({"error": f"Attendance already marked on {attendance_date}"}, status=status.HTTP_400_BAD_REQUEST)
            
            attendance = serializer.save()
            response_data = {
                "id": attendance.id,
                "date": attendance.date,
                "course_title": attendance.enrollment.course.title,
                "status": attendance.status,
                "marked_at": attendance.marked_at
            }
            return Response(response_data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LecturerAttendanceView(APIView):
    serializer_class = LecturerAttendanceSerializer

    def get(self, request):
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

        total = attendance_records.count()
        present_count = attendance_records.filter(status='present').count()
        attendance_percentage = round((present_count / total * 100)) if total > 0 else 0

        attendance_data = [
            {
                "date": record.date,
                "course_title": record.enrollment.course.title,
                "student_email": record.enrollment.student.email,
                "status": record.status,
            }
            for record in attendance_records
        ]
        
        return Response({
            "lecturer_name": lecturer.name,
            "attendance_percentage": attendance_percentage,
            "attendance_records": attendance_data
        })
    
    def post(self, request):
        return Response({"error": "Lecturers cannot mark attendance."}, status=status.HTTP_405_METHOD_NOT_ALLOWED)
