import {BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import Login from './components/pages/Login';
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
      </Routes>
    </Router>
  );
}

export default App;
