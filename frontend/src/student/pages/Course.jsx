// src/student/pages/Course.jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { useCourse } from "../../contexts/CourseContext";
import "../styles/Course.css";

function StudentCourseHome() {
  const { id } = useParams();
  const [student, setStudent] = useState(null);
  const [message, setMessage] = useState("");

  const {
    currentCourse,
    selectCourse,
    activeSession,
    setActiveSession,
    withinGeofence,
    setWithinGeofence,
    locationChecked,
    setLocationChecked,
  } = useCourse();

  // Load user + course
  useEffect(() => {
    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
    setStudent(loggedInUser);

    axios
      .get(`http://127.0.0.1:8000/courses/${id}/`)
      .then((res) => selectCourse(res.data))
      .catch((err) => console.error(err));

    fetchActiveSession(id);
  }, [id]);

  const fetchActiveSession = async (courseId) => {
    try {
      const resp = await axios.get(
        `http://127.0.0.1:8000/geofence/sessions/active/?course_id=${courseId}`
      );
      if (resp.data.active) setActiveSession(resp.data.session);
      else setActiveSession(null);
    } catch (err) {
      console.error(err);
    }
  };

  const checkLocation = () => {
    if (!navigator.geolocation) return alert("Geolocation not supported");
    if (!student) return alert("⚠️ No logged-in student found");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        try {
          const resp = await axios.post(
            "http://127.0.0.1:8000/geofence/check-access/",
            {
              course_id: Number(id),
              latitude: lat,
              longitude: lon,
              student: Number(student.id),
            }
          );

          setWithinGeofence(resp.data.allowed);
          setMessage(resp.data.note);
          setLocationChecked(true);
        } catch (err) {
          console.error(err);
          alert("Error checking location");
        }
      },
      (err) => alert("Location error: " + err.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  if (!currentCourse || !student) return <p>Loading...</p>;

  return (
    <div className="student-course-home">
      <h2 className="course-title">Student Course Home: {currentCourse.title}</h2>
      <p className="course-description">{currentCourse.description}</p>

      {activeSession ? (
        <div className="session-info">
          <p>✅ Active session running (ID {activeSession.id})</p>
          <p>Started at: {new Date(activeSession.start_time).toLocaleTimeString()}</p>
          <p>Duration: {activeSession.duration_minutes} minutes</p>

          <button onClick={checkLocation} className="check-location-btn">
            Check My Location
          </button>

          {locationChecked &&  (
            <p className="location-message">
              {withinGeofence ? "✅ You are within the geofence" : "❌ You are outside the geofence"}
              <br />
              {message}
            </p>
          )}
        </div>
      ) : (
        <p className="no-session">No active session</p>
      )}
    </div>
  );
}

export default StudentCourseHome;







