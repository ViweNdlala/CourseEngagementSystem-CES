import {BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import Login from './components/pages/Login';
import Home from './components/student/pages/Home';
import Course from "./components/student/pages/Course";
import './App.css';

function App() {
  return(
    <Router>
      {/* Navigation */}
      

      {/* Routes */}
      <Routes>
        <Route path="/" element={<Login />}/>
        <Route path="/Home" element={<Home />} />
        <Route path="/course/:id" element={<Course />} />
      </Routes>
    </Router>
  );
}

export default App;
