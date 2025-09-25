import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useCourse } from "../../contexts/CourseContext";
import axios from "axios";
import "../../lecturer/styles/Preparation.css";

/**
 * This component is designed for displaying weekly preparation resources
 */
export default function Preparation() {
  // Resource state management

  const { id } = useParams();
  const { currentCourse, selectCourse } = useCourse(); 
  const [course, setCourse] = useState(currentCourse);
  const [weeks, setWeeks] = useState([]);
  const [loading, setLoading] = useState(!currentCourse);

  //Load course data if not already available in context
  useEffect(() => {
    if (!currentCourse && id) {
      axios
        .get(`http://localhost:8000/courses/${id}/`)
        .then((res) => {
          setCourse(res.data);
          selectCourse(res.data); // Update global course context
        })
        .catch((err) => console.error("Failed to fetch course:", err))
        .finally(() => setLoading(false));
    }
  }, [id, currentCourse, selectCourse]);

  // Load preparation weeks when course is available
  useEffect(() => {
    if (course) {
      fetchWeeks();
    }
  }, [course]);

  /**
   * Fetches preparation weeks and associated resources for the current course
   * Displays error message if fetch fails
   */
  const fetchWeeks = async () => {
    try {
      const response = await axios.get(
        `http://localhost:8000/courses/${id}/preparation/weeks/`
      );
      setWeeks(response.data);
    } catch (error) {
      console.error("Failed to fetch data: ", error);
      alert("Failed to fetch preparation data.");
    }
  };

  // Loading and error states
  if (loading) return <p>Loading course preparation...</p>;
  if (!course) return <p>Course not found.</p>;

  return (
    <div className="preparation-container">
      <div className="preparation-header">
        <h1>Preparation for {course.title}</h1>
      </div>

      <div className="weeks-list">
        {/* Render each preparation week as a card */}
        {weeks.map((week) => (
          <div key={week.id} className="week-card">
            <div className="week-header">
              <h2>Week {week.week_number}</h2>
              <p>{week.welcome_message}</p>
            </div>
            <div className="week-content">
              <div className="resources-section">
                <div className="resources-header"></div>
                <div className="resources-list">
                  {/* Display associated resources for each week */}
                  {week.preparation_resources.map((resource) => (
                    <div key={resource.id} className="resource-item">
                      <div className="resource-info">
                        <p>
                          <strong>{resource.title}</strong>
                        </p>
                        {/* Clickable resource link */}
                        <a href={resource.url}>{resource.url}</a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
