// src/pages/student/StudentCourseHome.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCourse } from "../../contexts/CourseContext";
import axios from "axios";

function StudentCourseHome() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const { selectCourse } = useCourse();

  useEffect(() => {
    axios
      .get(`http://localhost:8000/courses/${id}/`)
      .then((res) => {
        setCourse(res.data);
        // Set the course in the context so navbar knows which course we're in
        selectCourse(res.data);
      })
      .catch((err) => {
        console.error("Failed getting course:", err);
        setCourse(null);
      })
      .finally(() => setLoading(false));
  }, [id, selectCourse]);

  if (loading) return <p>Loading course...</p>;
  if (!course) return <p>Course not found.</p>;

  return (
    <div>
      <h1>{course.title}</h1>
      <p>{course.description}</p>
    </div>
  );
}

export default StudentCourseHome;
