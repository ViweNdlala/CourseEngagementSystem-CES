// src/pages/StudentPoints.jsx
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
  const [description, setDescription] = useState("");
  const pollRef = useRef(null);

  // client-side count for requests this session
  const [requestsThisSession, setRequestsThisSession] = useState(0);

  const fetchRequests = async () => {
    if (!user?.id) return;
    try {
      const res = await axios.get("/points/requests/", { params: { student: user.id } });
      const all = res.data;
      if (!all || all.length === 0) {
        setLatestRequest(null);
        setRequestsThisSession(0);
        return;
      }
      // sort by created_at descending
      const sorted = all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setLatestRequest(sorted[0]);

      // count requests matching the current session id
      const sessId = activeSession?.id;
      if (sessId) {
        const count = all.filter(r => r.session_id && (r.session_id === sessId)).length;
        setRequestsThisSession(count);
      } else {
        setRequestsThisSession(0);
      }
    } catch (err) {
      console.error(err.response?.data || err.message);
    }
  };

  useEffect(() => {
    fetchRequests();
    pollRef.current = setInterval(fetchRequests, 5000);
    return () => clearInterval(pollRef.current);
  }, [user, activeSession]);

  const handleSubmit = async () => {
    if (!user?.id || !courseId) {
      setMessage("Missing user or course");
      return;
    }
    if (!activeSession?.id) {
      setMessage("No active session selected.");
      return;
    }
    if (!description || description.trim().length === 0) {
      setMessage("Please provide a short description of your question/answer.");
      return;
    }
    // Also prevent client-side if already reached 2
    if (requestsThisSession >= 2) {
      setMessage("You have already used your 2 requests for this session.");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const payload = {
        student: user.id,            // server will override student with authenticated user
        course: courseId,
        request_type: requestType,
        description: description.trim(),
        session_id: activeSession.id,
      };
      const res = await axios.post("/points/requests/", payload);
      setLatestRequest(res.data);
      setMessage("Request submitted successfully!");
      // increment local count immediately
      setRequestsThisSession(prev => prev + 1);
      setDescription("");
    } catch (err) {
      const errMsg = err.response?.data || err.message || "Failed to submit request";
      setMessage(typeof errMsg === "string" ? errMsg : JSON.stringify(errMsg));
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

  const isButtonDisabled = loading || !activeSession || !withinGeofence || !locationChecked || requestsThisSession >= 2;

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
          <span>Question (+10)</span>
        </label>
        <label>
          <input
            type="radio"
            checked={requestType === "answer"}
            onChange={() => setRequestType("answer")}
          />
          <span>Answer (+20)</span>
        </label>
      </div>

      <div style={{ marginTop: "0.75rem" }}>
        <label>
          Short description (what you asked or answered )
          <textarea
            maxLength={250}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            style={{ width: "100%", marginTop: "0.5rem" }}
            placeholder="Briefly describe your question or answer (max 250 chars)"
          />
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

        {requestsThisSession >= 2 && (
          <p style={{ color: "red", marginTop: "0.5rem" }}>
            You have reached the 2-request limit for this session.
          </p>
        )}
      </div>

      {message && <div className="success-message">{message}</div>}

      <div className="latest-request">
        <h3>My Latest Request</h3>
        {latestRequest ? (
          <div>
            <p>
              {latestRequest.request_type} — {latestRequest.points} points — {renderStatus(latestRequest)}
            </p>
            <p><strong>Description:</strong> {latestRequest.description}</p>
          </div>
        ) : (
          <p>No requests submitted yet.</p>
        )}
      </div>

      <Leaderboard />
    </div>
  );
}

export default StudentPoints;
