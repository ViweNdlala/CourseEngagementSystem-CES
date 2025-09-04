import React from "react";
import { NavLink } from "react-router-dom";
import "./Navbar.css";

function Navbar() {
  return (
    <nav className="navbar">
      <ul className="nav-list">
        <li>
          <NavLink to="coursehome">Course Home</NavLink>
        </li>
        <li>
          <NavLink to="preparation">Preparation</NavLink>
        </li>
        <li>
          <NavLink to="attendance">Attendance</NavLink>
        </li>
        <li>
          <NavLink to="quizzes">Quizzes</NavLink>
        </li>
        <li>
          <NavLink to="polls">Polls</NavLink>
        </li>
        <li>
          <NavLink to="points">Points</NavLink>
        </li>
      </ul>
    </nav>
  );
}

export default Navbar;
