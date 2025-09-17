import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useCourse } from "../../contexts/CourseContext";
import axios from "axios";
import "../styles/Preparation.css";

export default function Preparation() {
  const { id } = useParams();
  const { currentCourse, selectCourse } = useCourse();
  const [course, setCourse] = useState(currentCourse);
  const [loading, setLoading] = useState(!currentCourse);
  const [weeks, setWeeks] = useState([]);
  const [showCreateWeek, setShowCreateWeek] = useState(false);
  const [newWeek, setNewWeek] = useState({ week_number: "", welcome_message: "" });

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
  };

  async function createWeek() {
    try {
      await axios.post(`http://localhost:8000/courses/${id}/preparation/weeks`, newWeek);
      setNewWeek({ week_number: "", welcome_message: "" });
      setShowCreateWeek(false);
      fetchWeeks();
    } catch (error) {
      console.error("Failed to create week: ", error);
      alert("Failed to create week.");
    }
  };

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
        onClick={() => setShowCreateWeek(!showCreateWeek)}
      >
        Create New Week
      </button>

      <div className={`panel ${showCreateWeek ? "active" : ""}`}>
        <div className="panel-content">
          <div className="form-group">
            <label>Week Number:</label>
            <input
              type="number"
              value={newWeek.week_number}
              placeholder="e.g., 3"
              onChange={(e) => setNewWeek({ ...newWeek, week_number: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Welcome Message:</label>
            <textarea
              value={newWeek.welcome_message}
              placeholder="e.g., Welcome to Week 3! This week, we will..."
              onChange={(e) => setNewWeek({ ...newWeek, welcome_message: e.target.value })}
            />
          </div>
          <div className="form-actions">
            <button onClick={createWeek}> Create</button>
          </div>
        </div>
      </div>
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
