
import { useCourse } from "../../contexts/CourseContext";

function StudentAttendance() {
  const { activeSession, withinGeofence, locationChecked } = useCourse();

  const handleAttendance = () => {
    alert("Attendance submitted!");
  };

  
  // Disable button if:
  // - no active session
  // - OR not within geofence
  // - OR location not yet checked
  
  const isButtonDisabled = !activeSession || !withinGeofence || !locationChecked;

  
  // Decide what session message to show
  
  let sessionMessage;
  if (activeSession) {
    sessionMessage = <p>✅ Active session ID {activeSession.id}</p>;
  } else {
    sessionMessage = <p style={{ color: "red" }}>No active session</p>;
  }

  
  // Decide what geofence warning to show
  
  let geofenceWarning = null;
  if (activeSession && locationChecked && !withinGeofence) {
    geofenceWarning = (
      <p style={{ color: "red", marginTop: "0.5rem" }}>
        ❌ You must be within the geofence to mark attendance
      </p>
    );
  }

  
  return (
    <div className="attendance-page" style={{ padding: "1.5rem" }}>
      <h2>Attendance</h2>

      {/* Active session or fallback message */}
      {sessionMessage}

      {/* Attendance button */}
      <button onClick={handleAttendance} disabled={isButtonDisabled}>
        Mark Attendance
      </button>

      {/* Show geofence warning if needed */}
      {geofenceWarning}
    </div>
  );
}

export default StudentAttendance;

