
import {BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import Login from './components/pages/Login';
import { useState } from "react";


import './App.css';

import { UserProvider } from './contexts/UserContext';
import Layout from './components/Layout';


// Student pages
import StudentHome from "./student/pages/Home";
import StudentCourseHome from "./student/pages/Course";
import StudentPreparation from "./student/pages/Preparation";
import StudentAttendance from "./student/pages/Attendance";
import StudentQuizzes from "./student/pages/Quizzes";
import StudentPolls from "./student/pages/Polls";
import StudentPoints from "./student/pages/Points";

// Lecturer pages
import LecturerHome from "./lecturer/pages/Home";
import LecturerCourseHome from "./lecturer/pages/CourseHome";
import LecturerPreparation from "./lecturer/pages/Preparation";
import LecturerAttendance from "./lecturer/pages/Attendance";
import LecturerQuizzes from "./lecturer/pages/Quizzes";
import LecturerPolls from "./lecturer/pages/Polls";
import LecturerPoints from "./lecturer/pages/Points";

function App() {
  const [user, setUser] = useState(null);
  
  return(
    <UserProvider >
      <Router>
        {/* Routes */}
        <Routes>
          <Route path="/" element={<Login />}/>
          <Route path="/student/home" element={<StudentHome />} />
          <Route path="/lecturer/home" element={<LecturerHome />} />

          <Route element={<Layout />} >
            <Route path="/student/courses/:id" element={<StudentCourseHome />} />
            <Route path="/lecturer/courses/:id" element={<LecturerCourseHome />} />
            <Route path="/student/attendance" element={<StudentAttendance />} />
            <Route path="/student/quizzes" element={<StudentQuizzes />} />
            <Route path="/student/polls" element={<StudentPolls />} />
            <Route path="/student/points" element={<StudentPoints />} /
            <Route path="/student/preparation" element={<StudentPreparation />} />


            {/* Lecturer routes */}
            <Route
              path="/lecturer/coursehome"
              element={<LecturerCourseHome />}
            />
            <Route
              path="/lecturer/preparation"
              element={<LecturerPreparation />}
            />
            <Route
              path="/lecturer/attendance"
              element={<LecturerAttendance />}
            />
            <Route path="/lecturer/quizzes" element={<LecturerQuizzes />} />
            <Route path="/lecturer/polls" element={<LecturerPolls />} />
            <Route path="/lecturer/points" element={<LecturerPoints />} />
          </Route>
        </Routes>
      </Router>
    </UserProvider>
  );
}

export default App;
