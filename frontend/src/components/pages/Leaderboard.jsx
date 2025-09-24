import React, { useEffect, useState } from "react";
import axios from "axios";
import "../styles/Leaderboard.css";
import { useUser } from "../../contexts/UserContext"; 

axios.defaults.baseURL = "http://127.0.0.1:8000";

function Leaderboard({ courseId }) {
  const { user } = useUser();
  const [leaders, setLeaders] = useState([]);

  useEffect(() => {
    const fetchLeaders = async () => {
      try {
        const params = courseId ? { course: courseId } : {};
        const res = await axios.get("/points/leaderboard/", { params });
        let data = res.data;

        if (user?.role === "lecturer") {
          data = data.slice().sort((a, b) => a.total_points - b.total_points);
        }

        setLeaders(data);
      } catch (err) {
        console.error("fetch leaderboard error", err.response?.data || err.message);
      }
    };

    fetchLeaders();
    const interval = setInterval(fetchLeaders, 8000);
    return () => clearInterval(interval);
  }, [user, courseId]);

  return (
    <div className="leaderboard-container">
      <h3>Leaderboard</h3>
      {leaders.length === 0 ? (
        <p>No scores yet.</p>
      ) : (
        <ol>
          {leaders.map((l) => (
            <li key={l.id}>
              <span>{l.student_name || `Student ${l.student}`}</span>
              <span>{l.total_points} pts</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default Leaderboard;




