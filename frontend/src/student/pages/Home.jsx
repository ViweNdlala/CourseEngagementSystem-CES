import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useUser } from "../../contexts/UserContext";
import "../styles/Home.css"; // adjust path if needed
import "../../components/Header.css"; // adjust path if needed Final\CourseEngagementSystem-CES\frontend\src\student\pages\Home.jsx

function Header() {
  const { getRoleBasedRoute, user, logout } = useUser();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="header">
      <div className="header-left">
        <div className="user-menu">
          <button className="user-icon-btn">
            <i className="bx bxs-user"></i>
          </button>
          <span>Hi, {user?.name}</span>
          <div className="user-dropdown">
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </div>

      <Link className="logo" to={getRoleBasedRoute("home")}>
        Welcome to Mavix
      </Link>

      <div className="header-right">
        <i className="bx bxs-bell"></i>
      </div>
    </header>
  );
}

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
    <>
      <Header />
      <div className="home-container">
        <main className="courses-wrap">
          <h2 className="section-title">My Courses</h2>

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
                    <p>
                      <strong>Location:</strong> {c.location}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p>No courses found.</p>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
