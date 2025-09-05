import React from "react";
import { Link } from "react-router-dom";
import "./Header.css";

function Header() {
  return (
    <header className="header">
      <Link className="logo" to="/coursehome">
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
