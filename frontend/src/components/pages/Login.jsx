// Class to allow user login

import {Link, useNavigate, BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import {useState, useEffect} from 'react';
import axios from 'axios';
import '../styles/Login.css';

// Login function: welcome page with login
function Login(){

    // Variables
    const [users, setUsers] = useState([]);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

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
            // Direct user to home depending on role
            if(foundUser.role == "lecturer"){
                alert("Lecturer Courses home page");
                navigate("../lecturer/pages/Home");
            }else{
                alert("this user is a student");
                navigate("../student/pages/Home");
            }
        }else{
            alert("Invalid email or password");
        }
    }

    return(
        <div className="login-page">
            <div className="login-header">
                <h1><Link className="head-text"to="/">Mavix</Link></h1>
            </div>

            <div className="login-form-container">
                <div className="login-welcome">
                    <h1>Welcome to Mavix</h1>
                    <h2>Make Learning More Engaging</h2>
                </div>

                <div className="form-inputs">
                    <div className="label-form">
                        <label className="email-label">Email</label>
                        <input 
                            className="login-input" 
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="label-form">
                        <label className="password-label">Password</label>
                        <input 
                            className="login-input" 
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <button className="login-button" onClick={handleLogin}>Login</button>
                </div>
            </div>

            {/* test connection with backend */}
            {/* <div>
                <h1>Test connection with backend</h1>
                {users.map((user) =>(
                    <div className='user'>
                        <h2>ID: {user.id}</h2>
                        <h2>Name: {user.name}</h2>
                        <h2>Email: {user.email}</h2>
                        <h2>Passoword: {user.password}</h2>
                        <h2>Role: {user.role}</h2>
                    </div>
                ))}
            </div> */}
        </div>
    );
}

export default Login;