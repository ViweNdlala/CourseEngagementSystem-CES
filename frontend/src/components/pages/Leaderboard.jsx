import React, { useEffect, useState } from "react";
import axios from "axios";
import "../styles/Leaderboard.css";

axios.defaults.baseURL = "http://127.0.0.1:8000";

function Leaderboard() {
  const [leaders, setLeaders] = useState([]);

  useEffect(() => {
    const fetchLeaders = async () => {
      try {
        const res = await axios.get("/points/leaderboard/");
        setLeaders(res.data);
      } catch (err) {
        console.error("fetch leaderboard error", err.response?.data || err.message);
      }
    };

    fetchLeaders();
    const interval = setInterval(fetchLeaders, 8000);
    return () => clearInterval(interval);
  }, []);

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


