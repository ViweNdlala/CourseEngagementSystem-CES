import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUser } from "../contexts/UserContext";
import { useCourse } from "../contexts/CourseContext";
import "./Header.css";

function Header() {
  const { getRoleBasedRoute, user, logout } = useUser();
  const { currentCourse } = useCourse();
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

      <div className="course">
        {currentCourse ? currentCourse.title : "Course"}
      </div>
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
        <i className="bx bxs-bell"></i>
      </div>
    </header>
  );
}

export default Header;
