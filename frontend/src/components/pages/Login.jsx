import {Link, useNavigate} from 'react-router-dom';
import {useState, useEffect} from 'react';
import axios from 'axios';
import '../styles/Login.css';
import { useUser } from '../../contexts/UserContext';

// Configure axios to include CSRF token
axios.defaults.withCredentials = true;

function Login(){
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();
    const {login} = useUser();
    const [csrfToken, setCsrfToken] = useState("");

    // Get CSRF token on component mount
    useEffect(() => {
        const getCsrfToken = async () => {
            try {
                const response = await axios.get('http://localhost:8000/accounts/csrf/');
                setCsrfToken(response.data.csrfToken);
                axios.defaults.headers.common['X-CSRFToken'] = response.data.csrfToken;
            } catch (error) {
                console.error('Error fetching CSRF token:', error);
            }
        };
        getCsrfToken();
    }, []);

    // Function to handle the user login
    async function handleLogin() {
        if (!email || !password) {
            alert("Please enter both email and password");
            return;
        }

        try {
            // Send plain text password - backend will hash and compare
            const response = await axios.post("http://localhost:8000/accounts/login/", {
                email: email.toLowerCase().trim(),
                password: password // Send plain text - backend handles hashing
            }, {
                headers: {
                    'X-CSRFToken': csrfToken,
                    'Content-Type': 'application/json'
                }
            });

            const foundUser = response.data;
            
            if(foundUser && !foundUser.error){
                login(foundUser);
                localStorage.setItem("loggedInUser", JSON.stringify(foundUser));
                
                if(foundUser.role === "lecturer"){
                    navigate("/lecturer/home");
                }else{
                    navigate("/student/home");
                }
                
                setEmail("");
                setPassword("");
            }
        } catch (error) {
            if (error.response && error.response.status === 401) {
                alert("Invalid email or password!");
            } else {
                alert("Login failed. Please try again.");
                console.error('Login error:', error);
            }
            setEmail("");
            setPassword("");
        }
    }

    const handleSubmit = (e) => {
        e.preventDefault();
        handleLogin();
    };

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

                <form onSubmit={handleSubmit} className="form-inputs">
                    <div className="label-form">
                        <label className="email-label">Email</label>
                        <input
                            className="login-input"
                            type="email"
                            value={email}
                            placeholder="Enter email"
                            onChange={(e) => setEmail(e.target.value)}
                            required
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
                            required
                        />
                    </div>

                    <button type="submit" className="login-button">
                        Login
                    </button>
                </form>
            </div>
        </div>
    );
}

export default Login;