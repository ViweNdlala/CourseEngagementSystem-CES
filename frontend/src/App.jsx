import {BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import Login from './components/pages/Login';
import Layout from './components/Layout';
import Header from './components/Header';
import Navbar from './components/Navbar';
import Home from './components/pages/Home';
import Coursehome from './components/pages/CourseHome';
import './App.css';

import LecturerHome from './lecturer/pages/Home';
import StudentHome from './student/pages/Home';

function App() {
  return(
    <Router>
      {/* Routes */}
      <Routes>
        <Route path="/" element={<Login />}/>
        <Route path="/lecturer/pages/Home" element={<LecturerHome />} />
        <Route path="/student/pages/Home" element={<StudentHome />} />
        <Route element={<Layout />}>
          <Route path="/student/pages/CourseHome" element={<Coursehome />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
