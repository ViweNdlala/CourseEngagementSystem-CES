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
 * This component is designed for the following student functionality:
 * Displaying their attendance records, statistics
 * Marking of attendance for the current day - location verification included.
 */
export default function Attendance() {
  // Resource state management
  const { id } = useParams();

  // Access course context for session and location data
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

  /** Determine if attendance button should be disabled.
   * Requires: active session + correct location + location verified + not yet marked today
   */
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
  // Load course data if not available in context
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

  // Fetch enrollment and initial attendance data when course and user are available
  useEffect(() => {
    if (course && user) {
      // First, get the student's enrollment record for this course (required for marking attendance)
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

      // Initial fetch of attendance data
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
  /**
   * Marks student attendance for the current date.
   * Sends a POST request to create a "present" attendance record
   * Shows success/error messages and refreshes data after marking
   */
  async function markAttendance() {
    try {
      // Get today's date in ISO format (YYYY-MM-DD)
      const today = new Date().toISOString().split("T")[0];

      // Prepare attendance data payload for API
      const attendanceData = {
        enrollment: enrollment.id,
        date: today,
        status: "present",
      };
      // Submit attendance record to API
      const response = await axios.post(
        "http://localhost:8000/attendance/student/",
        attendanceData
      );

      if (response.status === 201) {
        alert("Attendance marked successfully!");

        // Refresh the attendance data to show updated records and statistics
        fetchAttendanceData();
      }
    } catch (error) {
      console.error("Error marking attendance:", error);
      alert("Failed to mark attendance. Please try again.");
    }
  }
  /**
   * Memoized computation of chart data for student attendance visualisation
   * Transforms attendance records into format suitable for chart visualisation
   * @returns {Array} Array of chart data points
   */
  const chartData = useMemo(() => {
    return attendanceRecords
      .sort((a, b) => new Date(a.date) - new Date(b.date)) // Sort chronologically
      .map((record) => ({
        date: new Date(record.date).toLocaleDateString("en-GB", {
          month: "short",
          day: "numeric",
        }),
        attendance: record.status === "present" ? 1 : 0, // Binary for chart visualisation (tick formatter)
        status: record.status,
      }));
  }, [attendanceRecords]);
  // Loading and error states
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
