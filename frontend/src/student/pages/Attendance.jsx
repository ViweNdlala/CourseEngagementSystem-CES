import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useCourse } from "../../contexts/CourseContext";
import { useUser } from "../../contexts/UserContext";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "../styles/Attendance.css";

export default function Attendance() {
  const { id } = useParams();
  const { currentCourse, selectCourse } = useCourse();
  const { user } = useUser();
  const [course, setCourse] = useState(currentCourse);
  const [loading, setLoading] = useState(!currentCourse);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [stats, setStats] = useState({ total: 0, present: 0, percentage: 0 });

  useEffect(() => {
    if (!currentCourse && id) {
      axios
        .get(`http://localhost:8000/courses/${id}/`)
        .then((res) => {
          setCourse(res.data);
          selectCourse(res.data);
        })
        .catch((err) => console.error("Failed to fetch course:", err))
        .finally(() => setLoading(false));
    }
  }, [id, currentCourse, selectCourse]);

  useEffect(() => {
    if (course && user) {
      axios
        .get(
          `http://localhost:8000/attendance/student/?id=${user.id}&course_id=${course.id}`
        )
        .then((res) => {
          console.log("Student attendance response:", res.data);
          const records = res.data || [];
          setAttendanceRecords(records);

          const total = records.length;
          const present = records.filter((record) => record.status === "present").length;
          const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
          setStats({ total, present, percentage });
        })
        .catch((err) => console.error("Failed to fetch attendance:", err));
    }
  }, [course, user]);

  if (loading) return <p>Loading attendance...</p>;
  if (!course) return <p>Course not found.</p>;

  return (
    <div className="attendance-container">
      <div className="attendance-header">
        <h1>My Attendance for {course?.title}</h1>
      </div>

      <div className="attendance-stats">
        <p>Classes Attended: {stats.present} / {stats.total}</p>
        <p>My Course Attendance: {stats.percentage}%</p>
      </div>

      <div className="attendance-history">
        <h3>My Attendance History</h3>
        <div className="chart-container">
          <p>Chart will go here - Records found: {attendanceRecords.length}</p>
        </div>
      </div>
    </div>
  );
}
