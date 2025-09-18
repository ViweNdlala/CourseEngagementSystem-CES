import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useUser } from "../../contexts/UserContext";
import { useCourse } from "../../contexts/CourseContext";
import { useParams } from "react-router-dom";
import Leaderboard from "../../components/pages/Leaderboard";
import "../styles/Points.css";

axios.defaults.baseURL = "http://127.0.0.1:8000";

function StudentPoints() {
  const { user } = useUser();
  const { activeSession, withinGeofence, locationChecked } = useCourse();
  const { id: courseId } = useParams();

  const [requestType, setRequestType] = useState("question");
  const [latestRequest, setLatestRequest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const pollRef = useRef(null);

  const fetchRequests = async () => {
    if (!user?.id) return;
    try {
      const res = await axios.get("/points/requests/", { params: { student: user.id } });
      if (res.data.length === 0) {
        setLatestRequest(null);
        return;
      }
      const sorted = res.data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setLatestRequest(sorted[0]);
    } catch (err) {
      console.error(err.response?.data || err.message);
    }
  };

  useEffect(() => {
    fetchRequests();
    pollRef.current = setInterval(fetchRequests, 5000);
    return () => clearInterval(pollRef.current);
  }, [user]);

  const handleSubmit = async () => {
    if (!user?.id || !courseId) {
      setMessage("Missing user or course");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const res = await axios.post("/points/requests/", {
        student: user.id,
        course: courseId,
        request_type: requestType,
      });
      setLatestRequest(res.data);
      setMessage("Request submitted successfully!");
    } catch (err) {
      setMessage(err.response?.data || "Failed to submit request");
    } finally {
      setLoading(false);
    }
  };

  const renderStatus = (request) => {
    if (!request) return "";
    if (request.approved) return " Approved";
    if (request.declined) return " Declined";
    return " Pending";
  };



  // Disable button if:loading OR no active session OR not within geofence OR location not yet checked
  const isButtonDisabled = loading || !activeSession || !withinGeofence || !locationChecked;

  return (
    <div className="student-container">
      <h2>Request Points</h2>

      <div className="request-type">
        <label>
          <input
            type="radio"
            checked={requestType === "question"}
            onChange={() => setRequestType("question")}
          />
          Question (+10)
        </label>
        <label>
          <input
            type="radio"
            checked={requestType === "answer"}
            onChange={() => setRequestType("answer")}
          />
          Answer (+20)
        </label>
      </div>

      <div className="submit-container">
        <button className="submit-btn" onClick={handleSubmit} disabled={isButtonDisabled}>
          {loading ? "Submitting..." : "Request Points"}
        </button>

        {!withinGeofence && locationChecked && (
          <p style={{ color: "red", marginTop: "0.5rem" }}>
             You must be within the geofence to request points
          </p>
        )}
        {!activeSession && (
          <p style={{ color: "red", marginTop: "0.5rem" }}>
             No active session
          </p>
        )}
      </div>

      {message && <div className="success-message">{message}</div>}

      <div className="latest-request">
        <h3>My Latest Request</h3>
        {latestRequest ? (
          <p>
            {latestRequest.request_type} — {latestRequest.points} points — {renderStatus(latestRequest)}
          </p>
        ) : (
          <p>No requests submitted yet.</p>
        )}
      </div>

      <Leaderboard />
    </div>
  );
}

export default StudentPoints;

