// Lectuer Home page with their courses// Student Home page with their courses
import { Link } from "react-router-dom";
import "../../components/Header.css";

function Header() {
  return (
    <header className="header">
      <Link className="logo" to="/lecturer/pages/Home">
        Mavix
      </Link>

      <div></div>
      <div className="header-right">
        <i className="bx bxs-user"></i>
        <i className="bx bxs-bell"></i>
      </div>
    </header>
  );
}
function LecCourses() {
  return (
    <div>
      <Header />
      <h1>This page is the lecturer Home page</h1>
    </div>
  );
}

export default LecCourses;