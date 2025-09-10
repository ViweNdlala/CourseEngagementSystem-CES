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
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [attendanceByDate, setAttendanceByDate] = useState({});
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
    axios
      .get(`http://localhost:8000/attendance/lecturer/?id=${user.id}`)
      .then((res) => {
        console.log("Attendance response:", res.data);
        const attendanceRecords = res.data.attendance_records || [];

        const currentCourseTitle = course.title;
        const courseAttendance = attendanceRecords.filter(
          (record) => record.course_title === currentCourseTitle
        );

        // group records by date
        const groupedByDate = {};
        for (const record of courseAttendance) {
          const dateKey = String(record.date);
          if (!groupedByDate[dateKey]) groupedByDate[dateKey] = [];
          groupedByDate[dateKey].push(record);
        }
        setAttendanceByDate(groupedByDate);

        const total = courseAttendance.length;
        const present = courseAttendance.filter((record) => record.status === "present")
          .length;
        const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
        setStats({ total, present, percentage });

        const students = [
          ...new Set(courseAttendance.map((r) => r.student_email)),
        ];
        setEnrolledStudents(students);
      })
      .catch((err) => console.error("Error fetching attendance data:", err));
  }, [course, user]);

  // Prepare data for the line chart
  const prepareChartData = () => {
    return Object.keys(attendanceByDate)
      .sort((a, b) => new Date(a) - new Date(b)) // chronological sort
      .map((date) => {
        const dayRecords = attendanceByDate[date];
        const presentCount = dayRecords.filter(
          (record) => record.status === "present"
        ).length;
        const absentRecords = dayRecords.filter((record) => record.status === "absent");
        const totalCount = dayRecords.length;
        const attendancePercentage =
          totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

        return {
          date: new Date(date).toLocaleDateString("en-GB", {
            month: "short",
            day: "numeric",
          }),
          fullDate: date,
          percentage: attendancePercentage,
          present: presentCount,
          total: totalCount,
          absentStudents: absentRecords.map((record) => record.student_email),
        };
      });
  };

  const chartData = prepareChartData();

  // Custom Tooltip Component
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="custom-tooltip">
          <h4>Attendance: {data.percentage}%</h4>
          <p>Absent students: {data.absentStudents.length}</p>

          {data.absentStudents && data.absentStudents.length > 0 && (
            <div>
              <ul>
                {data.absentStudents.map((email, index) => (
                  <li key={index}>{email}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  if (loading) return <p>Loading attendance data...</p>;
  if (!course) return <p>Course not found.</p>;

  return (
    <div className="attendance-container">
      <div className="attendance-header">
        <h1>Attendance for {course?.title}</h1>
      </div>

      <div className="attendance-stats">
          <p>Overall Course Attendance: {stats.percentage}%</p>
          <p>Enrolled Students: {enrolledStudents.length}</p>
      </div>

      <div className="attendance-history">
        <h3>Attendance History</h3>
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
                domain={[40, 100]}
                fontSize={12}
                label={{ value: "Attendance %", angle: -90 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="percentage"
                stroke="#295574"
                strokeWidth={3}
                dot={{ r: 6 }}
                activeDot={{ r: 8 }}
                name="Attendance %"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
