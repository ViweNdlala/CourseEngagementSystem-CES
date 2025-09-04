import {BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import Login from './components/pages/Login';
import './App.css';

function App() {
  return(
    <Router>
      {/* Navigation */}
      

      {/* Routes */}
      <Routes>
        <Route path="/" element={<Login />}/>
      </Routes>
    </Router>
  );
}

export default App;
