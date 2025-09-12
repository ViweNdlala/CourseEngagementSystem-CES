// src/pages/lecturer/LecturerCourseHome.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCourse } from "../../contexts/CourseContext";
import axios from "axios";

function LecturerCourseHome() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const { selectCourse } = useCourse();

   useEffect(() => {
    // Fetch course details
    axios
      .get(`http://localhost:8000/courses/${id}/`)
      .then((res) => {
        setCourse(res.data);
        selectCourse(res.data);
      })
      .catch((err) => {
        console.error("Failed getting course:", err);
        setCourse(null);
      });
    // Fetch enrollments for this course
    axios
      .get("http://localhost:8000/enrollments/")
      .then((res) => {
        const students = res.data
          .filter((e) => String(e.course) === String(id))
          .map((e) => e.student);
        setEnrolledStudents(students);
      })
      .catch((err) => console.error("Failed getting enrollments:", err))
      .finally(() => setLoading(false));
  }, [id, selectCourse]);

  if (loading) return <p>Loading course...</p>;
  if (!course) return <p>Course not found.</p>;

  return (
    <div>
      <h1>{course.title}</h1>
      <p>{course.description}</p>

      <h3>Enrolled Students (IDs)</h3>
      {enrolledStudents.length === 0 ? (
        <p>No students enrolled yet.</p>
      ) : (
        <ul>
          {enrolledStudents.map((sId) => (
            <li key={sId}>Student ID: {sId}</li>
          ))}
        </ul>
      )}

      {/* Later: add tools for uploading materials, managing assignments, etc. */}
      <button onClick={() => navigate(-1)}>← Back</button>
    </div>
  );
}

export default LecturerCourseHome;

