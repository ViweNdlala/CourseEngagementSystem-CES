import React from "react";
import Header from "./Header.jsx";
import Navbar from "./Navbar.jsx";
import { Outlet } from "react-router-dom";
import "./Layout.css"

function Layout() {
  return (
    <div className="app-shell">
      <Header />
      <div className="app-body">
        <Navbar />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
