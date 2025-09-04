import React from "react";
import { Link } from "react-router-dom";
import "../Header.css";

function Header() {
  return (
    <header className="header">
      <Link className="logo" to="/">Mavix</Link>
      <div></div>
      <div className="header-right">
        <i className="bx bxs-user"></i> 
        <i className="bx bxs-bell"></i>
      </div>
    </header>
  );
}

function Home() {
  return (
    <div>
      <Header />
      <h1>Home</h1>
      <div className="course-blob">
        <Link to="coursehome">CSC3003S</Link>
      </div>
    </div>
  );
}
export default Home;
