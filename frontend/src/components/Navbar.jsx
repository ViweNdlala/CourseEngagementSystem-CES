import React from "react";
import { NavLink } from "react-router-dom";
import { useUser } from "../contexts/UserContext";
import { useCourse } from "../contexts/CourseContext";
import "./Navbar.css";

function Navbar() {
  const { getCourseRoute } = useUser();
  const { currentCourse } = useCourse();

  // If no course is selected, don't show navbar
  if (!currentCourse) {
    return null;
  }

  return (
    <nav className="navbar">
      <ul className="nav-list">
        <li>
          <NavLink to={getCourseRoute("", currentCourse.id)}>
            Course Home
          </NavLink>
        </li>
        <li>
          <NavLink to={getCourseRoute("preparation", currentCourse.id)}>
            Preparation
          </NavLink>
        </li>
        <li>
          <NavLink to={getCourseRoute("attendance", currentCourse.id)}>
            Attendance
          </NavLink>
        </li>
        <li>
          <NavLink to={getCourseRoute("quizzes", currentCourse.id)}>
            Quizzes
          </NavLink>
        </li>
        <li>
          <NavLink to={getCourseRoute("points", currentCourse.id)}>
            Points
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}

export default Navbar;
