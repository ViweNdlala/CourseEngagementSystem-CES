import React, { useEffect, useState, useMemo } from "react";
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
  Tooltip,
} from "recharts";
import "../../lecturer/styles/Attendance.css";

/**
 * Student Attendance Component
 * Displays a student's attendance records, statistics, and allows marking of attendance
 * Enables real-time attendance marking and location verification
 */
export default function Attendance() {
  // Extract course ID from URL parameters
  const { id } = useParams();

  // Access course context for session and location data
  const {
    currentCourse,
    selectCourse,
    activeSession, // Current attendance session status
    withinGeofence, // Whether student is within required location
    locationChecked, // Whether location verification is complete
  } = useCourse();

  // Access user context for student information
  const { user } = useUser();

  // Component state management
  const [course, setCourse] = useState(currentCourse);
  const [loading, setLoading] = useState(!currentCourse);
  const [attendanceRecords, setAttendanceRecords] = useState([]); // Student's attendance history
  const [stats, setStats] = useState({ total: 0, present: 0, percentage: 0 }); // Attendance statistics
  const [enrollment, setEnrollment] = useState(null); // Student's course enrollment
  const [hasMarkedToday, setHasMarkedToday] = useState(false); // Prevents duplicate attendance marking

  // Determine if attendance button should be disabled
  // Requires: active session + correct location + location verified + not yet marked today
  const isButtonDisabled =
    !activeSession || !withinGeofence || !locationChecked || hasMarkedToday;

  /**
   * Fetches and updates student attendance data
   * Gets individual records + calculates statistics
   */
  const fetchAttendanceData = async () => {
    if (!course || !user) return;

    try {
      // Fetch student's individual attendance records
      const studentResponse = await axios.get(
        `http://localhost:8000/attendance/student/?id=${user.id}&course_id=${course.id}`
      );

      const records = studentResponse.data || [];
      setAttendanceRecords(records);

      // Count how many times student was present
      const studentPresent = records.filter(
        (record) => record.status === "present"
      ).length;

      try {
        // Fetch course-wide attendance data to get total attendance
        const lecturerResponse = await axios.get(
          `http://localhost:8000/attendance/lecturer/?id=${course.lecturer}`
        );

        const allRecords = lecturerResponse.data.attendance_records || [];
        const courseRecords = allRecords.filter(
          (record) => record.course_id === course.id
        );

        // Calculate total attendances from unique dates
        const uniqueDates = new Set(courseRecords.map((record) => record.date));
        const totalSessions = uniqueDates.size;

        // Calculate attendance percentage
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
      } catch (lecturerError) {
        console.warn(
          "Lecturer data unavailable, using individual stats:",
          lecturerError
        );
        // Fallback: use individual records if course-wide data unavailable
        const individualTotal = records.length;
        let percentage;
        if (individualTotal > 0) {
          percentage = Math.round((studentPresent / individualTotal) * 100);
        } else {
          percentage = 0;
        }

        setStats({
          total: individualTotal,
          present: studentPresent,
          percentage,
        });
      }

      // Check if student has marked attendance today
      const today = new Date().toISOString().split("T")[0];
      const todayRecord = records.find((record) => record.date === today);
      setHasMarkedToday(todayRecord && todayRecord.status === "present");
    } catch (error) {
      console.error("Failed to fetch attendance data:", error);
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
      // Reduced polling frequency - attendance data doesn't change frequently
      const pollInterval = setInterval(() => {
        // Only poll if the window is visible (to save resources)
        if (!document.hidden) {
          fetchAttendanceData();
        }
      }, 300000); // Poll every 5 minutes instead of 15 seconds

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

  // Memoized chart data to prevent unnecessary recalculations
  const chartData = useMemo(() => {
    return attendanceRecords
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map((record) => ({
        date: new Date(record.date).toLocaleDateString("en-GB", {
          month: "short",
          day: "numeric",
        }),
        attendance: record.status === "present" ? 1 : 0,
        status: record.status,
      }));
  }, [attendanceRecords]);

  if (loading) return <p>Loading attendance...</p>;
  if (!course) return <p>Course not found.</p>;

  let sessionMessage;
  if (activeSession) {
    sessionMessage = <p> Active session ID {activeSession.id}</p>;
  } else {
    sessionMessage = <p style={{ color: "red" }}>No active session</p>;
  }

  let geofenceWarning = null;
  if (activeSession && locationChecked && !withinGeofence) {
    geofenceWarning = (
      <p style={{ color: "red", marginTop: "0.5rem" }}>
        You must be within the geofence to mark attendance
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
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 0,
                bottom: 0,
              }}
            >
              <XAxis dataKey="date" fontSize={12} stroke="black" />
              <YAxis
                domain={[0, 1]}
                fontSize={12}
                stroke="black"
                ticks={[0, 1]}
                tickFormatter={(value) => (value === 1 ? "Present" : "Absent")}
              />
              <Tooltip
                labelFormatter={(label) => `Date: ${label}`}
                trigger="click"
                wrapperStyle={{ pointerEvents: "auto" }}
              />
              <Line
                type="monotone"
                dataKey="attendance"
                stroke="#295574"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                name="Attendance"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
