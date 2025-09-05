// Class to allow user login

import {Link, useNavigate} from 'react-router-dom';
import {useState, useEffect} from 'react';
import axios from 'axios';
import '../styles/Login.css';

// Login function: welcome page with login
function Login(){

    // Variables
    const [users, setUsers] = useState([]);
<<<<<<< HEAD
=======
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

>>>>>>> eff1c13fb86b7b617102c3bcc3001038f266a752
    // Fetch user accounts from the backend
    useEffect( () =>{
        axios
            .get("http://localhost:8000")
            .then((res)=> setUsers(res.data))
            .catch((err) => alert(err));
    }, []);

<<<<<<< HEAD
=======
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
                setEmail("");
                setPassword("");
                navigate("../student/pages/Home");
            }
        }else{
            alert("Invalid email or password");
            setEmail("");
            setPassword("");
        }
    }
>>>>>>> eff1c13fb86b7b617102c3bcc3001038f266a752

    return(
        <div className="login-page">
            <div className="login-header">
                <h1><Link className="head-text"to="/">Mavix</Link></h1>
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
                            placeholder="namesurname01@gmail.com"
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="label-form">
                        <label className="password-label">Password</label>
                        <input 
                            className="login-input" 
                            type="password"
                            value={password}
                            placeholder="password123"
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
<<<<<<< HEAD
                    
                    <Link to="/Home">
                        <button className="login-button">Login</button>
                    </Link>
                    
=======
                    <button className="login-button" onClick={handleLogin}>Login</button>
>>>>>>> eff1c13fb86b7b617102c3bcc3001038f266a752
                </div>
            </div>
        </div>
    );
}

export default Login;