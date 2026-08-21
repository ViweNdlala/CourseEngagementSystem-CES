import "../styles/Home.css";
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useUser } from "../../contexts/UserContext";
import "../../components/Header.css";
// import axios from "axios";

/**
 * Header component
 * - Displays logo, welcome message, and user menu.
 * - Handles logout and role-based navigation.
 */
function Header() {
  const { getRoleBasedRoute, user, logout } = useUser();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="header">
      <Link className="logo" to={getRoleBasedRoute("home")}>
        Mavix
      </Link>

      <div className="center">Welcome to Mavix</div>
      <div className="header-right">
        <div className="user-menu">
          <button className="user-icon-btn">
            <i className="bx bxs-user"></i>
          </button>
          Hi, {user?.name}
          <div className="user-dropdown">
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

//displays courses the logged-in student is enrolled in
function StudentHome() {
  const [student, setStudent] = useState(null);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [loading, setLoading] = useState(true); 
  const navigate = useNavigate();

  const {axios} = useUser();
  // Load student info and all courses
  useEffect(() => {
    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
    if (loggedInUser && loggedInUser.role === "student") {
      setStudent(loggedInUser);
    }

    axios
      .get("/courses/")
      .then((res) => setAllCourses(res.data))
      .catch((err) => console.log(err));
  }, []);

  // Filter courses based on student's enrollments
  useEffect(() => {
    if (student) {
      setLoading(true); 
      axios
        .get("/enrollments/")
        .then((res) => {
          const myEnrollmentIds = res.data
            .filter((e) => e.student === student.id)
            .map((e) => e.course);

          const myCourses = allCourses.filter((c) =>
            myEnrollmentIds.includes(c.id)
          );

          setEnrolledCourses(myCourses);
        })
        .catch((err) => console.log(err))
        .finally(() => setLoading(false)); 
    }
  }, [student, allCourses]);

  if (!student) return <p>No student logged in</p>; // handle no student scenario

  return (
    <>
      <Header />
      <div className="courses-container">
        <main className="courses-wrap">
          <h2 className="section-title">My Courses</h2>

          <div className="courses-grid">
            {loading ? (
              <p>Loading courses...</p>
            ) : enrolledCourses.length > 0 ? (
              enrolledCourses.map((c) => (
                <div
                  key={c.id}
                  className="course-card"
                  onClick={() => navigate(`/student/courses/${c.id}/`)}
                >
                  <div className="course-info">
                    <h3>{c.title}</h3>
                    <p>{c.description}</p>
                  </div>
                </div>
              ))
            ) : (
              <p>You are not enrolled in any courses.</p>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

export default StudentHome;




