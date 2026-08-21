/**
 * Login.jsx
 * 
 * Component: Login
 * Purpose: Provides a login form where users can authenticate using email and password. 
 * Handles CSRF token setup, form submission, and navigation after login. 
 */

import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import "../styles/Login.css";
import { useUser } from "../../contexts/UserContext";



function Login() {
    // Component state for form inputs
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // CSRF token state
    const [csrfToken, setCsrfToken] = useState("");

    // Navigation hook
    const navigate = useNavigate();

    // Access login function, axios, etc from UserContext
    const { login, axios } = useUser();


    /**
     * useEffect: Fetch CSRF token on component mount
     */
    useEffect(() => {
        const getCsrfToken = async () => {
            try {
                const response = await axios.get("/accounts/csrf/");
                setCsrfToken(response.data.csrfToken);

                // Attach CSRF token to axios default headers
                axios.defaults.headers.common["X-CSRFToken"] = response.data.csrfToken;
            } catch (error) {
                console.error("Error fetching CSRF token:", error);
            }
        };

        getCsrfToken();
    }, []);

    /**
     * handleLogin: Sends login request to backend
     * - Validates form inputs
     * - Submits login data
     * - Stores user info in context and localStorage
     * - Navigates user based on role
     */
    async function handleLogin() {
        if (!email || !password) {
            alert("Please enter both email and password");
            return;
        }

        try {
            const response = await axios.post(
                "http://localhost:8000/accounts/login/",
                {
                    email: email.trim(),
                    password: password, // Plain text; backend handles hashing
                },
                {
                    headers: {
                        "X-CSRFToken": csrfToken,
                        "Content-Type": "application/json",
                    },
                }
            );

            const foundUser = response.data;

            if (foundUser && !foundUser.error) {
                // Save user in context and localStorage
                login(foundUser);
                localStorage.setItem("loggedInUser", JSON.stringify(foundUser));

                // Navigate based on role
                if (foundUser.role === "lecturer") {
                    navigate("/lecturer/home");
                } else {
                    navigate("/student/home");
                }

                // Clear inputs
                setEmail("");
                setPassword("");
            }
        } catch (error) {
            // Handle specific errors
            if (error.response && error.response.status === 401) {
                alert("Invalid email or password!");
            } else {
                alert("Login failed. Please try again.");
                console.error("Login error:", error);
            }

            // Reset form
            setEmail("");
            setPassword("");
        }
    }

    /**
     * handleSubmit: Prevents default form submit and triggers handleLogin
     */
    const handleSubmit = (e) => {
        e.preventDefault();
        handleLogin();
    };

    /**
     * Component JSX
     */
    return (
        <div className="login-page">
            {/* Header */}
            <div className="login-header">
                <h1>
                    <Link className="head-text" to="/">
                        Mavix
                    </Link>
                </h1>
            </div>

            {/* Login form container */}
            <div className="login-form-container">
                <div className="login-welcome">
                    <h1>Welcome to Mavix</h1>
                    <h2>Where Every Lesson Comes Alive</h2>
                </div>

                {/* Login form */}
                <form onSubmit={handleSubmit} className="form-inputs">
                    {/* Email input */}
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

                    {/* Password input */}
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

                    {/* Submit button */}
                    <button type="submit" className="login-button">
                        Login
                    </button>
                </form>
            </div>
        </div>
    );
}

export default Login;
