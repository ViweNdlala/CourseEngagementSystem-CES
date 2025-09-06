import React from "react";
import { Link } from "react-router-dom";
import { useUser } from "../contexts/UserContext";
import "./Header.css";

function Header() {
  const { getRoleBasedRoute, user } = useUser();

  return (
    <header className="header">
      <Link className="logo" to={getRoleBasedRoute("home")}>
        Mavix
      </Link>

      <div className="course">Course</div>
      <div className="header-right">
        <i className="bx bxs-user"></i>
        <i className="bx bxs-bell"></i>
      </div>
    </header>
  );
}

export default Header;
