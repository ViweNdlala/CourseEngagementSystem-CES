import "../styles/Home.css";
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useUser } from "../../contexts/UserContext";
import "../../components/Header.css"; 
import axios from "axios";

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
        <button className="notification">
          <i className="bx bxs-bell"></i>
        </button>
      </div>
    </header>
  );
}

//displays all courses taught by the logged-in lecturer
function LecturerHome() {
  const [lecturer, setLecturer] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Load lecturer info 
  useEffect(() => {
    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
    if (loggedInUser && loggedInUser.role === "lecturer") {
      setLecturer(loggedInUser);
    }
  }, []);

  // Fetch courses taught by lecturer whenever lecturer changes
  useEffect(() => {
    if (!lecturer) return;

    setLoading(true);

    axios
      .get("http://localhost:8000/courses/")
      .then((res) => {
        const myCourses = res.data.filter((c) => c.lecturer === lecturer.id);
        setCourses(myCourses);
      })
      .catch((err) => console.log(err))
      .finally(() => setLoading(false));
  }, [lecturer]);

  if (!lecturer) return <p>No lecturer logged in</p>; // handle no lecturer scenario

  return (
    <>
      <Header />
      <div className="home-container">
        <main className="courses-wrap">
          <h2 className="section-title">My Courses</h2>
          <div className="courses-grid">
            {loading ? (
              <p>Loading courses...</p>
            ) : courses.length > 0 ? (
              courses.map((c) => (
                <div
                  key={c.id}
                  className="course-card"
                  onClick={() => navigate(`/lecturer/courses/${c.id}/`)}
                >
                  <div className="course-info">
                    <h3>{c.title}</h3>
                    <p>{c.description}</p>
                  </div>
                </div>
              ))
            ) : (
              <p>You are not teaching any courses.</p>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

export default LecturerHome;

