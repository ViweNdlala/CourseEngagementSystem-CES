import {BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import Login from './components/pages/Login';
import Layout from './components/Layout';
import Header from './components/Header';
import Navbar from './components/Navbar';
import Home from './components/pages/Home';
import Coursehome from './components/pages/CourseHome';
import './App.css';

function App() {
  return(
    <Router>
      {/* Navigation */}
      

      {/* Routes */}
      <Routes>
        <Route path="/" element={<Login />}/>
        <Route path="/home" element={<Home />}/>
        <Route element={<Layout />}>
          <Route path="/coursehome" element={<Coursehome />}/>
          {/* other pages will follow */}
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
