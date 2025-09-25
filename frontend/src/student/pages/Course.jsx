import { useEffect, useState } from "react"; 
import { useParams } from "react-router-dom";
import axios from "axios";
import { useCourse } from "../../contexts/CourseContext";
import "../styles/Course.css";

//allows student to view course and join active geofence session
function StudentCourseHome() {
  const { id } = useParams(); // course id
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

  // Generate a unique localStorage key per student + course
  const storageKey = (studentId, courseId) => `student_session_${studentId}_${courseId}`;

  // Schedule clearing state when session expires
  const scheduleExpiry = (expiresAt, loggedInUser) => {
    const timeout = expiresAt - Date.now();
    if (timeout > 0) {
      setTimeout(() => {
        setWithinGeofence(false);
        setLocationChecked(false);
        setMessage("Session expired");
        localStorage.removeItem(storageKey(loggedInUser.id, id));
      }, timeout);
    }
  };

  // Load user + course + restore session if exists
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
      if (!mounted || !loggedInUser) return;

      // Reset state if student changed
      if (!student || loggedInUser.id !== student.id) {
        setWithinGeofence(false);
        setLocationChecked(false);
        setMessage("");
      }

      setStudent(loggedInUser);

      // Fetch course info
      try {
        const courseResp = await axios.get(`http://127.0.0.1:8000/courses/${id}/`);
        if (!mounted) return;
        selectCourse(courseResp.data);
      } catch (err) {
        console.error("Failed to fetch course:", err);
      }

      // Fetch active session
      let session = null;
      try {
        const resp = await axios.get(
          `http://127.0.0.1:8000/geofence/sessions/active/?course_id=${id}`
        );
        session = resp.data.active ? resp.data.session : null;
        if (!mounted) return;
        setActiveSession(session);
      } catch (err) {
        console.error("Failed to fetch active session:", err);
      }

      // Restore session if exists for this student + course
      if (session) {
        const raw = localStorage.getItem(storageKey(loggedInUser.id, id));
        if (raw) {
          try {
            const saved = JSON.parse(raw);
            if (
              saved.sessionId === session.id &&
              saved.joined === true &&
              Date.now() < saved.expiresAt
            ) {
              setWithinGeofence(Boolean(saved.withinGeofence));
              setLocationChecked(true);
              setMessage("Session restored");
              scheduleExpiry(saved.expiresAt, loggedInUser);
            } else {
              localStorage.removeItem(storageKey(loggedInUser.id, id));
            }
          } catch {
            localStorage.removeItem(storageKey(loggedInUser.id, id));
          }
        }
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [id, student?.id]);

  // Check student location to see if within geofence using geolocation API
  const checkLocation = () => {
    if (!navigator.geolocation) return alert("Geolocation not supported");
    if (!student) return alert("No logged-in student found");
    if (!activeSession) return alert("No active session");

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

          // Save session state in localStorage per student + course
          const expiresAt = new Date(activeSession.start_time).getTime() +
            activeSession.duration_minutes * 60 * 1000;

          localStorage.setItem(
            storageKey(student.id, id),
            JSON.stringify({
              courseId: id,
              sessionId: activeSession.id,
              withinGeofence: resp.data.allowed,
              joined: true,
              expiresAt,
            })
          );

          scheduleExpiry(expiresAt, student);

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
          <p> Active session </p>
          <p>Started at: {new Date(activeSession.start_time).toLocaleTimeString()}</p>
          <p>Duration: {activeSession.duration_minutes} minutes</p>

          {!locationChecked && (
            <button onClick={checkLocation} className="check-location-btn">
              Join Session
            </button>
          )}

          {locationChecked && (
            <p className="location-message">
              {withinGeofence ? " You are within the geofence" : " You are outside the geofence"}
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
