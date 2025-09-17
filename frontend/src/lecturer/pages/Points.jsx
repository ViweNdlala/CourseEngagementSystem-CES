import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useUser } from "../../contexts/UserContext";
import { useParams } from "react-router-dom";
import Leaderboard from "../../components/pages/Leaderboard";
import "../styles/Points.css";

axios.defaults.baseURL = "http://127.0.0.1:8000";

function LecturerPoints() {
  const { user } = useUser();
  const { id: courseId } = useParams();
  const [pending, setPending] = useState([]);
  const [queue, setQueue] = useState([]);
  const pollRef = useRef(null);
  const [loadingIds, setLoadingIds] = useState([]);
  const prevQueueLengthRef = useRef(0);

  const fetchPending = async () => {
    if (!user?.id) return;
    try {
      const params = { lecturer: user.id };
      if (courseId) params.course = courseId;
      const res = await axios.get("/points/requests/", { params });
      const items = res.data;
      setPending(items);

      const serverPendingNotifications = items.filter(i => i.notification_pending);
      setQueue(prev => {
        const existingIds = new Set(prev.map(x => x.id));
        return prev.concat(serverPendingNotifications.filter(i => !existingIds.has(i.id)));
      });

      const newUnnotified = items.filter(i => !i.is_notified && !i.notification_pending);
      if (newUnnotified.length > 0) {
        const ids = newUnnotified.map(i => i.id);
        await axios.patch("/points/requests/mark_notified/", { ids });
        setQueue(prev => {
          const existing = new Set(prev.map(x => x.id));
          return prev.concat(newUnnotified.filter(i => !existing.has(i.id)));
        });
        setPending(prev => prev.map(p => ids.includes(p.id) ? { ...p, is_notified: true, notification_pending: true } : p));
      }
    } catch (err) {
      console.error(err.response?.data || err.message);
    }
  };

  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "granted") Notification.requestPermission().catch(() => {});
  }, []);

  useEffect(() => {
    fetchPending();
    pollRef.current = setInterval(fetchPending, 6000);
    return () => clearInterval(pollRef.current);
  }, [user, courseId]);

  useEffect(() => {
    const prev = prevQueueLengthRef.current;
    const cur = queue.length;
    if (prev === 0 && cur > 0 && "Notification" in window && Notification.permission === "granted") {
      const front = queue[0];
      const extra = cur - 1;
      const body = `${front.student_name || "Student " + front.student} requested ${front.points} pts (${front.request_type})${extra > 0 ? ` — +${extra} more` : ""}`;
      const n = new Notification("New point request", { body });
      n.onclick = () => window.focus();
    }
    prevQueueLengthRef.current = cur;
  }, [queue]);

  const handleApprove = async (id) => {
    setLoadingIds(ids => [...ids, id]);
    try { await axios.post(`/points/requests/${id}/approve/`, { lecturer: user.id });
      setQueue(q => q.filter(i => i.id !== id));
      setPending(p => p.filter(i => i.id !== id));
    } finally { setLoadingIds(ids => ids.filter(x => x !== id)); }
  };


  const handleDecline = async (id) => {
    setLoadingIds(ids => [...ids, id]);
    try { await axios.post(`/points/requests/${id}/decline/`, { lecturer: user.id });
      setQueue(q => q.filter(i => i.id !== id));
      setPending(p => p.filter(i => i.id !== id));
    } finally { setLoadingIds(ids => ids.filter(x => x !== id)); }
  };

  const handleDismiss = async (id) => {
    try { await axios.patch(`/points/requests/${id}/dismiss_notification/`);
      setQueue(q => q.filter(i => i.id !== id));
      setPending(p => p.map(p => p.id === id ? { ...p, notification_pending: false } : p));
    } catch(err){ console.error(err.response?.data||err.message); }
  };

  return (
    <div className="lecturer-container">
      <h2>Pending Point Requests</h2>
      {pending.length === 0 ? <p>No pending requests</p> :
        <ul>
          {pending.map(r => (
            <li key={r.id}>
              {r.student_name || `Student ${r.student}`} requested {r.points} pts ({r.request_type})
              <button className="approve-btn" onClick={() => handleApprove(r.id)} disabled={loadingIds.includes(r.id)}>Approve</button>
              <button className="decline-btn" onClick={() => handleDecline(r.id)} disabled={loadingIds.includes(r.id)}>Decline</button>
            </li>
          ))}
        </ul>
      }

      {queue.length > 0 && (
        <div className="floating-notification">
          <div className="floating-notification-header">
            <strong>New Point Request</strong>
            {queue.length > 1 && <span>+{queue.length - 1}</span>}
          </div>
          <div className="floating-notification-body">
            <div><strong>{queue[0].student_name || `Student ${queue[0].student}`}</strong></div>
            <div>{queue[0].request_type} — {queue[0].points} pts</div>
            <div>{new Date(queue[0].created_at).toLocaleString()}</div>
          </div>
          <div className="floating-notification-actions">
            <button className="dismiss-btn" onClick={() => handleDismiss(queue[0].id)}>Dismiss</button>
            <button className="decline-btn" onClick={() => handleDecline(queue[0].id)} disabled={loadingIds.includes(queue[0].id)}>Decline</button>
            <button className="approve-btn" onClick={() => handleApprove(queue[0].id)} disabled={loadingIds.includes(queue[0].id)}>Approve</button>
          </div>
        </div>
      )}

      <Leaderboard />
    </div>
  );
}

export default LecturerPoints;

