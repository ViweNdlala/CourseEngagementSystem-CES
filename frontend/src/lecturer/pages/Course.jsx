import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useCourse } from "../../contexts/CourseContext";
import axios from "axios";

function LecturerCourseHome() {
  const { id } = useParams(); // course id
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [course, setCourse] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [duration, setDuration] = useState(60); // default duration
  const { selectCourse } = useCourse();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("loggedInUser"));
    setLoggedInUser(user);

    axios.get(`http://127.0.0.1:8000/courses/${id}/`)
      .then(res => {
        setCourse(res.data);
        selectCourse(res.data); 
      })
      .catch(err => console.error(err));

      

    fetchActiveSession(id);
  }, [id]);

  const fetchActiveSession = async (courseId) => {
    try {
      const resp = await axios.get(`http://127.0.0.1:8000/geofence/sessions/active/?course_id=${courseId}`);
      if (resp.data.active) setActiveSession(resp.data.session);
      else setActiveSession(null);
    } catch (err) { console.error(err); }
  };

  const startSession = () => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported");
      return;
    }

    if (!loggedInUser) {
    alert("User not loaded yet");
    return;
    }


    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;

      try {
        const resp = await axios.post("http://127.0.0.1:8000/geofence/sessions/", {
          course: id,
          lecturer: loggedInUser.id,
          latitude: lat,
          longitude: lon,
          radius_meters: 100,
          duration_minutes: parseInt(duration, 10)
        });
        setActiveSession(resp.data);
        alert("✅ Geofence session started!");
      } catch (err) {
        console.error(err.response?.data || err);
        alert("❌ Failed to start session");
      }
    }, err => alert("Location error: " + err.message), 
    { enableHighAccuracy: true ,timeout: 10000, maximumAge: 0});
  };

  if (!course) return <p>Loading course...</p>;

  return (
    <div className="p-6">
      <h2>Lecturer Course Home: {course.title}</h2>
      <p>{course.description}</p>

      <div className="mt-4">
        <label>Duration (minutes): </label>
        <input type="number" value={duration} onChange={e => setDuration(e.target.value)} />
      </div>

      <button onClick={startSession}>Start Geofence Session</button>

      {activeSession && (
        <div>
          <p>✅ Active session ID {activeSession.id}</p>
          <p>Started at: {new Date(activeSession.start_time).toLocaleTimeString()}</p>
          <p>Duration: {activeSession.duration_minutes} minutes</p>
        </div>
      )}
    </div>
  );
}

export default LecturerCourseHome;





