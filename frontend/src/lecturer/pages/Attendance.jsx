import React, { useEffect, useState, useMemo, useCallback } from "react";
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
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState(null);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [attendanceByDate, setAttendanceByDate] = useState({});
  const [rawAttendanceData, setRawAttendanceData] = useState([]);
  const [stats, setStats] = useState({ total: 0, present: 0, percentage: 0 });
  const [clickedDataPoint, setClickedDataPoint] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentAttendanceData, setStudentAttendanceData] = useState([]);

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
      setDataLoading(true);
      setError(null);

      axios
        .get(`http://localhost:8000/attendance/lecturer/?id=${user.id}`)
        .then((res) => {
          const attendanceRecords = res.data.attendance_records || [];
          const courseAttendance = attendanceRecords.filter(
            (record) => record.course_id === course?.id
          );

          // Store raw data for reuse
          setRawAttendanceData(courseAttendance);

          //Data processing in a single loop
          const groupedByDate = {};
          const uniqueStudents = new Set();
          let totalRecords = 0;
          let presentCount = 0;

          courseAttendance.forEach((record) => {
            // Group by date
            const dateKey = String(record.date);
            if (!groupedByDate[dateKey]) {
              groupedByDate[dateKey] = [];
            }
            groupedByDate[dateKey].push(record);

            // Count stats
            totalRecords++;
            if (record.status === "present") {
              presentCount++;
            }

            // Collect unique students
            if (record.student_email) {
              uniqueStudents.add(record.student_email);
            }
          });
          setAttendanceByDate(groupedByDate);

          const percentage =
            totalRecords > 0
              ? Math.round((presentCount / totalRecords) * 100)
              : 0;
          setStats({ total: totalRecords, present: presentCount, percentage });
          setEnrolledStudents(Array.from(uniqueStudents));
        })
        .catch((err) => {
          console.error("Error fetching attendance data:", err);
          setError("Failed to load attendance data. Please try again.");
        })
        .finally(() => {
          setDataLoading(false);
        });
    }
  }, [course?.id, user?.id]);

  // Memoized to avoid recalculation
  const studentChartData = useMemo(() => {
    if (!selectedStudent || !rawAttendanceData.length) {
      return [];
    }

    // Only process if student is selected (lazy loading)
    const studentRecords = rawAttendanceData.filter(
      (record) =>
        record.student_email === selectedStudent.email &&
        record.course_id === course?.id
    );

    // Group and process efficiently
    const chartData = studentRecords.reduce((acc, record) => {
      const date = record.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(record);
      return acc;
    }, {});

    return Object.entries(chartData)
      .map(([date, records]) => {
        const isPresent = records.some((record) => record.status === "present");
        return {
          date: new Date(date).toLocaleDateString("en-GB", {
            month: "short",
            day: "numeric",
          }),
          status: isPresent ? 1 : 0,
          statusText: isPresent ? "Present" : "Absent",
          rawDate: date,
        };
      })
      .sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate));
  }, [selectedStudent, rawAttendanceData, course?.id]);

  // Update student attendance data when chart data changes
  useEffect(() => {
    setStudentAttendanceData(studentChartData);
  }, [studentChartData]);

  // Optimize chart data calculation with better memoization
  const chartData = useMemo(() => {
    if (!attendanceByDate || Object.keys(attendanceByDate).length === 0) {
      return [];
    }

    return Object.entries(attendanceByDate)
      .sort(([dateA], [dateB]) => new Date(dateA) - new Date(dateB))
      .map(([date, dayRecords]) => {
        // Process records more efficiently
        let presentCount = 0;
        const absentStudents = [];

        dayRecords.forEach((record) => {
          if (record.status === "present") {
            presentCount++;
          } else if (record.status === "absent") {
            absentStudents.push({
              email: record.student_email,
              name: record.student_name || record.student_email,
            });
          }
        });

        const totalCount = dayRecords.length;
        const attendancePercentage =
          totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

        return {
          date: new Date(date).toLocaleDateString("en-GB", {
            month: "short",
            day: "numeric",
          }),
          percentage: attendancePercentage,
          present: presentCount,
          total: totalCount,
          absentStudents,
          rawDate: date,
        };
      });
  }, [attendanceByDate]);

  const handleStudentClick = useCallback(
    (studentEmail) => {
      const studentData = clickedDataPoint.absentStudents.find(
        (s) => s.email === studentEmail
      );
      setSelectedStudent(studentData);
    },
    [clickedDataPoint]
  );

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      setClickedDataPoint(data);

      return (
        <div className="custom-tooltip">
          <h4>Attendance: {data.percentage}%</h4>
          <p>Absent students: {data.absentStudents.length}</p>
          <p>See details below</p>
        </div>
      );
    }
    return null;
  };

  if (loading) return <p>Loading attendance data...</p>;
  if (!course) return <p>Course not found.</p>;
  if (error) return <p className="error-message">{error}</p>;

  return (
    <div className="attendance-container">
      <div className="attendance-header">
        <h1>Attendance</h1>
      </div>
      <div className="attendance-stats">
        <p>Average Attendance: {stats.percentage}%</p>
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
              stroke="black"
            >
              <XAxis dataKey="date" fontSize={12} stroke="black" />
              <YAxis
                domain={[0, 100]}
                fontSize={12}
                stroke="black"
                label={{ value: "Attendance %", angle: -90 }}
              />
              <Tooltip
                content={<CustomTooltip />}
                trigger="click"
                wrapperStyle={{ pointerEvents: "auto" }}
              />
              <Line
                type="monotone"
                dataKey="percentage"
                stroke="#295574"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                name="Attendance %"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {clickedDataPoint && (
          <div className="absent-students-section">
            <h4>Absent Students on {clickedDataPoint.date}:</h4>
            {clickedDataPoint.absentStudents.length > 0 ? (
              <ul className="absent-students-list">
                {clickedDataPoint.absentStudents.map((student, index) => (
                  <li key={index} className="absent-student-email">
                    <p>
                      {index + 1}.
                      <span
                        className="student-name"
                        onClick={() => handleStudentClick(student.email)}
                      >
                        {student.name}
                      </span>
                      <a href={`mailto:${student.email}`}>{student.email}</a>
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p>None</p>
            )}
          </div>
        )}

        {selectedStudent && studentAttendanceData.length > 0 && (
          <div className="student-chart-section">
            <h4>{selectedStudent.name}'s Attendance</h4>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={studentAttendanceData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 0,
                    bottom: 5,
                  }}
                >
                  <XAxis dataKey="date" fontSize={12} stroke="black" />
                  <YAxis
                    domain={[0, 1]}
                    fontSize={12}
                    stroke="black"
                    ticks={[0, 1]}
                    tickFormatter={(value) =>
                      value === 1 ? "Present" : "Absent"
                    }
                  />
                  <Tooltip
                    labelFormatter={(label) => `Date: ${label}`}
                    trigger="click"
                    wrapperStyle={{ pointerEvents: "auto" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="status"
                    stroke="#295574"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Attendance Status"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
