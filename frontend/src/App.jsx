/**
 * ==========================================================
 * File: App.js
 * Purpose: Main application component that sets up:
 *  - Global context providers (User, Course)
 *  - Routing for student and lecturer dashboards
 *  - Layout wrapper for shared navigation and UI
 * ==========================================================
 */

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState } from "react";
import "./App.css";

// Context providers for managing global state
import { UserProvider } from "./contexts/UserContext";
import { CourseProvider } from "./contexts/CourseContext";

// Shared components
import Login from "./components/pages/Login";
import Layout from "./components/Layout";

// ------------------ Student Pages ------------------
import StudentHome from "./student/pages/Home";
import StudentCourseHome from "./student/pages/Course";
import StudentPreparation from "./student/pages/Preparation";
import StudentAttendance from "./student/pages/Attendance";
import StudentQuizzes from "./student/pages/Quizzes";
import StudentPoints from "./student/pages/Points";

// ------------------ Lecturer Pages ------------------
import LecturerHome from "./lecturer/pages/Home";
import LecturerCourseHome from "./lecturer/pages/Course";
import LecturerPreparation from "./lecturer/pages/Preparation";
import LecturerAttendance from "./lecturer/pages/Attendance";
import LecturerQuizzes from "./lecturer/pages/Quizzes";
import LecturerPoints from "./lecturer/pages/Points";

/**
 * App Component
 * - Wraps the app with global providers
 * - Defines all available routes for Student and Lecturer views
 */
function App() {
  // Local state for user (if needed later in context or props)
  const [user, setUser] = useState(null);

  return (
    <UserProvider>
      <CourseProvider>
        <Router>
          <Routes>
            {/* Public route: Login */}
            <Route path="/" element={<Login />} />

            {/* Top-level Student and Lecturer home pages */}
            <Route path="/student/home" element={<StudentHome />} />
            <Route path="/lecturer/home" element={<LecturerHome />} />

            {/* Nested routes wrapped with Layout (common navigation/UI) */}
            <Route element={<Layout />}>
              {/* -------- Student Routes -------- */}
              <Route path="/student/courses/:id" element={<StudentCourseHome />} />
              <Route path="/student/courses/:id/coursehome" element={<StudentCourseHome />} />
              <Route path="/student/courses/:id/attendance" element={<StudentAttendance />} />
              <Route path="/student/courses/:id/quizzes" element={<StudentQuizzes />} />
              <Route path="/student/courses/:id/points" element={<StudentPoints />} />
              <Route path="/student/courses/:id/preparation" element={<StudentPreparation />} />

              {/* -------- Lecturer Routes -------- */}
              <Route path="/lecturer/courses/:id" element={<LecturerCourseHome />} />
              <Route path="/lecturer/courses/:id/coursehome" element={<LecturerCourseHome />} />
              <Route path="/lecturer/courses/:id/preparation" element={<LecturerPreparation />} />
              <Route path="/lecturer/courses/:id/attendance" element={<LecturerAttendance />} />
              <Route path="/lecturer/courses/:id/quizzes" element={<LecturerQuizzes />} />
              <Route path="/lecturer/courses/:id/points" element={<LecturerPoints />} />
            </Route>
          </Routes>
        </Router>
      </CourseProvider>
    </UserProvider>
  );
}

export default App;
