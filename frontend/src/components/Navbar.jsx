import React from "react";
import { NavLink } from "react-router-dom";
import { useUser } from "../contexts/UserContext";
import { useCourse } from "../contexts/CourseContext";
import "./Navbar.css";

/**
 * Sidebar navigation component with course-specific menu items.
 * With mobile-responsive with overlay
 * 
 * @param {Object} props Component props
 * @param {boolean} props.isOpen Whether the navbar is currently open
 * @param {Function} props.toggleNavbar Function to close the navbar
 */
function Navbar({ isOpen, toggleNavbar }) {
  const { getCourseRoute } = useUser();
  const { currentCourse } = useCourse();

  // Hide navbar if no course is selected
  if (!currentCourse) {
    return null;
  }

  /**
   * Handles navigation link clicks.
   * Automatically closes navbar on mobile devices for better UX.
   */
  const handleLinkClick = () => {
    // Close navbar on mobile when a link is clicked
    if (window.innerWidth <= 768) {
      toggleNavbar();
    }
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && <div className="navbar-overlay" onClick={toggleNavbar}></div>}

      <nav className={`navbar ${isOpen ? "navbar-open" : ""}`}>
        <ul className="nav-list">
          <li>
            <NavLink
              to={getCourseRoute("", currentCourse.id)}
              onClick={handleLinkClick}
            >
              Course Home
            </NavLink>
          </li>
          <li>
            <NavLink
              to={getCourseRoute("preparation", currentCourse.id)}
              onClick={handleLinkClick}
            >
              Preparation
            </NavLink>
          </li>
          <li>
            <NavLink
              to={getCourseRoute("attendance", currentCourse.id)}
              onClick={handleLinkClick}
            >
              Attendance
            </NavLink>
          </li>
          <li>
            <NavLink
              to={getCourseRoute("quizzes", currentCourse.id)}
              onClick={handleLinkClick}
            >
              Quizzes
            </NavLink>
          </li>
          <li>
            <NavLink
              to={getCourseRoute("points", currentCourse.id)}
              onClick={handleLinkClick}
            >
              Points
            </NavLink>
          </li>
        </ul>
      </nav>
    </>
  );
}

export default Navbar;
