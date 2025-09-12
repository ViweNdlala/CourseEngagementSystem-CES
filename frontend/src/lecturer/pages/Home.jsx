// src/pages/LecturerHome.jsx
import "../styles/Home.css";
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useUser } from "../../contexts/UserContext";

import "../../components/Header.css"; // adjust path if needed Final\CourseEngagementSystem-CES\frontend\src\student\pages\Home.jsx
import axios from "axios";

function Header() {
  const { getRoleBasedRoute, user, logout } = useUser();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="header">
      <Link className="logo" to={getRoleBasedRoute("home")}>
        Mavix
      </Link>

      <div className="center">Welcome to Mavix</div>
      <div className="header-right">
        <div className="user-menu">
          <button className="user-icon-btn">
            <i className="bx bxs-user"></i>
          </button>
          Hi, {user?.name}
          <div className="user-dropdown">
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
        <button className="notification">
          <i className="bx bxs-bell"></i>
        </button>
      </div>
    </header>
  );
}

function LecturerHome() {
  const [courses, setCourses] = useState([]);
  const [lecturer, setLecturer] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
    if (loggedInUser && loggedInUser.role === "lecturer") {
      setLecturer(loggedInUser);
    }
  }, []);

  useEffect(() => {
    if (lecturer) {
      axios
        .get("http://localhost:8000/courses/")
        .then((res) => {
          const myCourses = res.data.filter((c) => c.lecturer === lecturer.id);
          setCourses(myCourses);
        })
        .catch((err) => console.log(err));
    }
  }, [lecturer]);

  if (!lecturer) return <p>No lecturer logged in</p>;

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
                  onClick={() => navigate(`/lecturer/courses/${c.id}/`)}
                >
                  <div className="course-info">
                    <h3>{c.title}</h3>
                    <p>{c.description}</p>
                  </div>
                </div>
              ))
            ) : (
              <p>You are not teaching any courses.</p>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

export default LecturerHome;
