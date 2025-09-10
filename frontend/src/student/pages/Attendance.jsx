import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useCourse } from "../../contexts/CourseContext";
import { useUser } from "../../contexts/UserContext";
import axios from "axios";

export default function Attendance() {
  const { id } = useParams();
  const { currentCourse, selectCourse } = useCourse();
  const { user } = useUser();
  const [course, setCourse] = useState(currentCourse);
  const [loading, setLoading] = useState(!currentCourse);

  useEffect(() => {
    if (!currentCourse && id) {
      axios
        .get(`http://localhost:8000/courses/${id}/`)
        .then((res) => {
          setCourse(res.data);
          selectCourse(res.data);
        })
        .catch((err) => console.error("Failed to fetch course:", err))
        .finally(() => setLoading(false));
    }
  }, [id, currentCourse, selectCourse]);
  
useEffect(() => {
    axios
      .get(`http://localhost:8000/attendance/student/?id=${user.id}`)
      .then((res) => {
        console.log("Attendance response:", res.data);
        const attendanceRecords = res.data.courses || [];
        const courseAttendance = attendanceRecords.filter((record) => record.course === course.title);
        console.log("Filtered course attendance:", courseAttendance);
      })
      
      .catch((err) => console.error("Failed to fetch attendance:", err));
  }, [course, user]);


  if (loading) return <p>Loading attendance...</p>;
  if (!course) return <p>Course not found.</p>;

  return <h1>Attendance for {course?.title}</h1>;
}
