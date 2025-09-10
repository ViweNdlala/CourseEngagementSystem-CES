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
import "../../lecturer/styles/Attendance.css";

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

  const prepareChartData = () => {
    return attendanceRecords
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map((record) => {
        const attendanceValue = record.status === "present" ? 1 : 0;
        
        return {
          date: new Date(record.date).toLocaleDateString("en-GB", {
            month: "short",
            day: "numeric",
          }),
          attendance: attendanceValue,
          status: record.status,
          originalDate: record.date,
        };
      });
  };

  const chartData = prepareChartData();

  if (loading) return <p>Loading attendance...</p>;
  if (!course) return <p>Course not found.</p>;

  return (
    <div className="attendance-container">
      <div className="attendance-header">
        <h1>My Attendance</h1>
      </div>

      <div className="mark-attendance-container">
        <div className="attendance-stats">
          <p>Classes Attended: {stats.present} / {stats.total}</p>
          <p>My Course Attendance: {stats.percentage}%</p>
        </div>
        <button className="attendance-button">Mark attendance</button>
      </div>

      <div className="attendance-history">
        <h3>My Attendance History</h3>
        <div className="chart-container">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={chartData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 0,
                  bottom: 0,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis
                  domain={[0, 1]}
                  fontSize={12}
                  ticks={[0, 1]}
                  tickFormatter={(value) => value === 1 ? 'Present' : 'Absent'}
                />
               
                <Legend />
                <Line
                  type="monotone"
                  dataKey="attendance"
                  stroke="#295574"
                  strokeWidth={3}
                  dot={{ r: 6 }}
                  activeDot={{ r: 8 }}
                  name="Attendance"
                />
              </LineChart>
            </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
