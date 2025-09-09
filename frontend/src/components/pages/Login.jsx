// Class to allow user login

import {Link, useNavigate} from 'react-router-dom';
import {useState, useEffect} from 'react';
import axios from 'axios';
import '../styles/Login.css';
import { useUser } from '../../contexts/UserContext';

// Login function: welcome page with login
function Login(){

    // Variables
    const [users, setUsers] = useState([]);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();
    const {login} = useUser();


    // Fetch user accounts from the backend
    useEffect( () =>{
        axios
            .get("http://localhost:8000")
            .then((res)=> setUsers(res.data))
            .catch((err) => alert(err));
    }, []);


    // Function to hadle the user login
    function handleLogin() {

        // Look for user with entered email and password
        const foundUser = users.find((user) => {
            return user.email === email && user.password === password;
        });

        if(foundUser){
            login(foundUser);
            localStorage.setItem("loggedInUser", JSON.stringify(foundUser));
            // Direct user to home depending on role
            if(foundUser.role == "lecturer"){
                navigate("/lecturer/home");
                setEmail("");
                setPassword("");
            }else{
                setEmail("");
                setPassword("");
                navigate("/student/home");
            }
        }else{
            alert("Invalid email or passoword!");
            setEmail("");
            setPassword("");
        }

    }
  

  return (
    <div className="login-page">
      <div className="login-header">
        <h1>
          <Link className="head-text" to="/">
            Mavix
          </Link>
        </h1>
      </div>

      <div className="login-form-container">
        <div className="login-welcome">
          <h1>Welcome to Mavix</h1>
          <h2>Where Every Lesson Comes Alive</h2>
        </div>

        <div className="form-inputs">
          <div className="label-form">
            <label className="email-label">Email</label>
            <input
              className="login-input"
              type="email"
              value={email}
              placeholder="Enter email"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="label-form">
            <label className="password-label">Password</label>
            <input
              className="login-input"
              type="password"
              value={password}
              placeholder="Enter password"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button className="login-button" onClick={handleLogin}>
            Login
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
