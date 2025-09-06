import React from "react";
import { NavLink } from "react-router-dom";
import { useUser } from "../contexts/UserContext";
import "./Navbar.css";

function Navbar() {
  const { getRoleBasedRoute } = useUser();

  return (
    <nav className="navbar">
      <ul className="nav-list">
        <li>
          <NavLink to={getRoleBasedRoute("coursehome")}>Course Home</NavLink>
        </li>
        <li>
          <NavLink to={getRoleBasedRoute("preparation")}>Preparation</NavLink>
        </li>
        <li>
          <NavLink to={getRoleBasedRoute("attendance")}>Attendance</NavLink>
        </li>
        <li>
          <NavLink to={getRoleBasedRoute("quizzes")}>Quizzes</NavLink>
        </li>
        <li>
          <NavLink to={getRoleBasedRoute("polls")}>Polls</NavLink>
        </li>
        <li>
          <NavLink to={getRoleBasedRoute("points")}>Points</NavLink>
        </li>
      </ul>
    </nav>
  );
}

export default Navbar;
