// Student Home page with their courses
import { Link } from "react-router-dom";
import "../../components/Header.css";

function Header() {
  return (
    <header className="header">
      <Link className="logo" to="/student/pages/Home">
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
function StuCourses() {
  return (
    <>
      <Header />
      <h1>This page is the Student Home page</h1>
      <div className="course-blob">
        <Link to="/student/pages/coursehome">CSC3003S</Link>
      </div>
      
    </>
  );
}

export default StuCourses;