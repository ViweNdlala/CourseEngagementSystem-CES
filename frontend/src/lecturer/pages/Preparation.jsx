import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useCourse } from "../../contexts/CourseContext";
import axios from "axios";

export default function Preparation() {
  const { id } = useParams();
  const { currentCourse, selectCourse } = useCourse();
  const [course, setCourse] = useState(currentCourse);
  const [loading, setLoading] = useState(!currentCourse);
  const [weeks, setWeeks] = useState([]);

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
    if (course) {
      fetchWeeks();
    }
  }, [course]);

  async function fetchWeeks() {
    try {
      const response = await axios.get(
        `http://localhost:8000/courses/${id}/preparation/weeks`
      );
      setWeeks(response.data);
    } catch (error) {
      console.error("Failed to fetch data: ", error);
      alert("Failed to fetch preparation data.");
    }
  }

  if (loading) return <p>Loading preparation tools...</p>;
  if (!course) return <p>Course not found.</p>;

  return (
    <div className="preparation-container">
      <div className="preparation-header">
        <h1>Lecturer Preparation: {course.title}</h1>
      </div>

      <div className="weeks-list">
      <button
        className="accordion"
      >
        Create New Week
      </button>
        {weeks.map((week) => (
          <div key={week.id} className="week-card">
            <div className="week-header">
              <h2>Week {week.week_number}</h2>
              <p>{week.welcome_message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
