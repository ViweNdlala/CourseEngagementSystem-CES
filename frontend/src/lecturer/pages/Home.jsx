import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./styles/Home.css"; // adjust path if needed

export default function Home() {
  const [courses, setCourses] = useState([]);
  const navigate = useNavigate(); // hook to navigate programmatically

  useEffect(() => {
    axios
      .get("http://localhost:8000/courses/")
      .then((res) => setCourses(res.data.courses))
      .catch((err) => console.error(err));
  }, []);

  const goToCourse = (id) => {
    navigate(`/course/${id}`); // navigate to the course page
  };

  return (
    <div className="home-container">
      <main className="courses-wrap">
        <h2 className="section-title">lecturer My Courses</h2>

        <div className="courses-grid">
          {courses.length > 0 ? (
            courses.map((c) => (
              <div
                key={c.id}
                className="course-card"
                onClick={() => goToCourse(c.id)} // navigate on click
              >
                <div className="course-info">
                  <h3>{c.name}</h3>
                  <p>{c.description}</p>
                  <p><strong>Location:</strong> {c.location}</p>
                </div>
              </div>
            ))
          ) : (
            <p>No courses found.</p>
          )}
        </div>
      </main>
    </div>
  );
}
