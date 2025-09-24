import React, { useState } from "react";
import Header from "./Header.jsx";
import Navbar from "./Navbar.jsx";
import { Outlet } from "react-router-dom";
import "./Layout.css";

function Layout() {
  const [isNavbarOpen, setIsNavbarOpen] = useState(false);

  const toggleNavbar = () => {
    setIsNavbarOpen(!isNavbarOpen);
  };

  return (
    <div className="app-shell">
      <Header toggleNavbar={toggleNavbar} />
      <div className="app-body">
        <Navbar isOpen={isNavbarOpen} toggleNavbar={toggleNavbar} />
        <main className={`main-content ${isNavbarOpen ? "navbar-open" : ""}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
