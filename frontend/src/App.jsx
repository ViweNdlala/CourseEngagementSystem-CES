import {BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import Login from './components/pages/Login';
import Course from "./student/pages/Course";
import './App.css';

import LecturerHome from './lecturer/pages/Home';
import StudentHome from './student/pages/Home';

function App() {
  return(
    <Router>
      {/* Routes */}
      <Routes>
        <Route path="/" element={<Login />}/>
        <Route path="/student/home" element={<StudentHome />} />
        <Route path="/lecturer/home" element={<LecturerHome />} />
        <Route path="/course/:id" element={<Course />} />
      </Routes>
    </Router>
  );
}

export default App;
