import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUser } from "../contexts/UserContext";
import { useCourse } from "../contexts/CourseContext";
import "./Header.css";

/**
 * Header component displaying the application navbar, logo, and user menu.
 * 
 * Features:
 * - Responsive navbar toggle for mobile
 * - User menu with logout functionality
 * - Navigation integration with role-based routing
 * 
 * @param {Object} props Component props
 * @param {Function} props.toggleNavbar Function to toggle sidebar navigation
 */
function Header({ toggleNavbar }) {
  const { getRoleBasedRoute, user, logout } = useUser();
  const { currentCourse } = useCourse();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="header">
      <div className="header-left">
        <button className="navbar-toggle" onClick={toggleNavbar}>
          <i className="bx bx-menu"></i>
        </button>
        <Link className="logo" to={getRoleBasedRoute("home")}>
          Mavix
        </Link>
      </div>

      <div className="center">
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
      </div>
    </header>
  );
}

export default Header;
