import {BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import Login from './components/pages/Login';
import Home from './components/student/pages/Home';
import Course from "./components/student/pages/Course";
import './App.css';

import LecturerHome from './lecturer/pages/Home';
import StudentHome from './student/pages/Home';

function App() {
  return(
    <Router>
      {/* Routes */}
      <Routes>
        <Route path="/" element={<Login />}/>
      </Routes>
    </Router>
  );
}

export default App;
