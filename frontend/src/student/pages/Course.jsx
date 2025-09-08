// src/pages/student/StudentCourseHome.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

function StudentCourseHome() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

    useEffect(() => {
    axios
      .get(`http://localhost:8000/courses/${id}/`)
      .then((res) => setCourse(res.data))
      .catch((err) => {
        console.error("Failed getting course:", err);
        setCourse(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p>Loading course...</p>;
  if (!course) return <p>Course not found.</p>;

  return (
    <div>
      <h1>{course.title}</h1>
      <p>{course.description}</p>

      {/* Later: show assignments, resources, etc. */}
      <button onClick={() => navigate(-1)}>← Back</button>
    </div>
  );
}

export default StudentCourseHome;

