// Class to allow user login

import {Link} from 'react-router-dom';
import {useState, useEffect} from 'react';
import axios from 'axios';
import '../styles/Login.css';


// Login function: welcome page with login
function Login(){
    const [users, setUsers] = useState([]);
    // Fetch user accounts from the backend
    useEffect( () =>{
        axios
            .get("http://localhost:8000")
            .then((res)=> setUsers(res.data))
            .catch((err) => alert(err));
    }, []);


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
                        <input className="login-input"></input>
                    </div>
                    <div className="label-form">
                        <label className="password-label">Password</label>
                        <input className="login-input"></input>
                    </div>
                    
                    <Link to="/Home">
                        <button className="login-button">Login</button>
                    </Link>
                    
                </div>
            </div>
            
            {/* test connection with backend */}
            <div>
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
            </div>
        </div>
    );
}

export default Login;