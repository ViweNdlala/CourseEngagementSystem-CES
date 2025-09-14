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
  Legend,
  ResponsiveContainer,
} from "recharts";
import "../../lecturer/styles/Attendance.css";

export default function Attendance() {
  const { id } = useParams();
  const {
    currentCourse,
    selectCourse,
    activeSession,
    withinGeofence,
    locationChecked,
  } = useCourse();
  const { user } = useUser();
  const [course, setCourse] = useState(currentCourse);
  const [loading, setLoading] = useState(!currentCourse);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [stats, setStats] = useState({ total: 0, present: 0, percentage: 0 });
  const [enrollment, setEnrollment] = useState(null);
  const [hasMarkedToday, setHasMarkedToday] = useState(false);
  const [lastRecordCount, setLastRecordCount] = useState(0);
  const isButtonDisabled =
    !activeSession || !withinGeofence || !locationChecked || hasMarkedToday;

  // Function to fetch and update attendance data
  const fetchAttendanceData = () => {
    if (course && user) {
      // Get student's individual attendance records
      axios
        .get(
          `http://localhost:8000/attendance/student/?id=${user.id}&course_id=${course.id}`
        )
        .then((res) => {
          const records = res.data || [];
          setAttendanceRecords(records);

          const studentPresent = records.filter(
            (record) => record.status === "present"
          ).length;

          // Get course-wide stats using lecturer's view
          axios
            .get(
              `http://localhost:8000/attendance/lecturer/?id=${course.lecturer}`
            )
            .then((lecturerRes) => {
              const allRecords = lecturerRes.data.attendance_records || [];
              const courseRecords = allRecords.filter(
                (record) => record.course_id === course.id
              );

              // Get unique dates to count total sessions
              const uniqueDates = new Set(
                courseRecords.map((record) => record.date)
              );
              const totalSessions = uniqueDates.size;

              let percentage;
              if (totalSessions > 0) {
                percentage = Math.round((studentPresent / totalSessions) * 100);
              } else {
                percentage = 0;
              }

              setStats({
                total: totalSessions,
                present: studentPresent,
                percentage,
              });

              // Update record count for change detection (use total sessions)
              setLastRecordCount(totalSessions);
            })
            .catch(() => {
              // Fallback to individual stats if lecturer data unavailable
              const individualTotal = records.length;
              let percentage =
                individualTotal > 0
                  ? Math.round((studentPresent / individualTotal) * 100)
                  : 0;

              setStats({
                total: individualTotal,
                present: studentPresent,
                percentage,
              });
              setLastRecordCount(individualTotal);
            });

          const today = new Date().toISOString().split("T")[0];
          const cutoffDate = "2025-08-30";
          const isNewBehavior = today >= cutoffDate;

          if (isNewBehavior) {
            const todayRecord = records.find((record) => record.date === today);
            setHasMarkedToday(todayRecord && todayRecord.status === "present");
          } else {
            const todayRecord = records.find((record) => record.date === today);
            setHasMarkedToday(!!todayRecord);
          }
        })
        .catch((err) => console.error("Failed to fetch attendance:", err));
    }
  };

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
        .get("http://localhost:8000/enrollments/")
        .then((res) => {
          const studentEnrollment = res.data.find(
            (enrollment) =>
              enrollment.student === user.id && enrollment.course === course.id
          );
          setEnrollment(studentEnrollment);
        })
        .catch((error) => console.error("Failed to fetch enrollment:", error));

      // Initial fetch
      fetchAttendanceData();
    }
  }, [course, user]);

  // Polling effect to check for attendance updates
  useEffect(() => {
    if (course && user) {
      const pollInterval = setInterval(() => {
        // Only poll if the window is visible (to save resources)
        if (!document.hidden) {
          fetchAttendanceData();
        }
      }, 15000); // Poll every 15 seconds

      // Also listen for window focus to immediately refresh
      const handleFocus = () => {
        fetchAttendanceData();
      };

      window.addEventListener("focus", handleFocus);

      return () => {
        clearInterval(pollInterval);
        window.removeEventListener("focus", handleFocus);
      };
    }
  }, [course, user]);

  async function markAttendance() {
    try {
      const today = new Date().toISOString().split("T")[0];
      const cutoffDate = "2025-08-30";
      const isNewBehavior = today >= cutoffDate;

      const attendanceData = {
        enrollment: enrollment.id,
        date: today,
        status: "present",
      };

      const response = await axios.post(
        "http://localhost:8000/attendance/student/",
        attendanceData
      );

      if (response.status === 201) {
        alert("Attendance marked successfully!");

        // Refresh the attendance data to show updated records
        fetchAttendanceData();
      }
    } catch (error) {
      console.error("Error marking attendance:", error);
      alert("Failed to mark attendance. Please try again.");
    }
  }

  const prepareChartData = () => {
    return attendanceRecords
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map((record) => {
        let attendanceValue;
        if (record.status === "present") {
          attendanceValue = 1;
        } else {
          attendanceValue = 0;
        }

        return {
          date: new Date(record.date).toLocaleDateString("en-GB", {
            month: "short",
            day: "numeric",
          }),
          attendance: attendanceValue,
          status: record.status,
        };
      });
  };

  const chartData = prepareChartData();

  if (loading) return <p>Loading attendance...</p>;
  if (!course) return <p>Course not found.</p>;

  let sessionMessage;
  if (activeSession) {
    sessionMessage = <p>✅ Active session ID {activeSession.id}</p>;
  } else {
    sessionMessage = <p style={{ color: "red" }}>No active session</p>;
  }

  let geofenceWarning = null;
  if (activeSession && locationChecked && !withinGeofence) {
    geofenceWarning = (
      <p style={{ color: "red", marginTop: "0.5rem" }}>
        ❌ You must be within the geofence to mark attendance
      </p>
    );
  }

  return (
    <div className="attendance-container">
      <div className="attendance-header">
        <h1>My Attendance</h1>
        {sessionMessage}
      </div>

      <div className="mark-attendance-container">
        <div className="attendance-stats">
          <p>
            Classes Attended: {stats.present} / {stats.total}: (
            {stats.percentage}%)
          </p>
        </div>

        <button
          className="attendance-button"
          onClick={markAttendance}
          disabled={isButtonDisabled}
        >
          Mark Attendance
        </button>
        {geofenceWarning}
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
                tickFormatter={(value) => (value === 1 ? "Present" : "Absent")}
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
