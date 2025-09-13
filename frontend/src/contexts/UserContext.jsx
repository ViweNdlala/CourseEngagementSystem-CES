/* This manages the current course state across the app*/

import React, { createContext, useContext, useState , useEffect } from "react";

// Create the User Context
const UserContext = createContext();

// Custom hook to use the UserContext
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};

// UserProvider component to wrap the app
export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);

   // Rehydrate from localStorage on startup
  useEffect(() => {
    const storedUser = localStorage.getItem("loggedInUser");
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem("loggedInUser", JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("loggedInUser");
  };

  const getRoleBasedRoute = (page) => {
    if (!user) return "/";
    if (user.role === "lecturer") {
      return `/lecturer/${page}`;
    } else {
      return `/student/${page}`;
    }
  };
  /* generates course-specific routes*/
  const getCourseRoute = (page, courseId) => {
    if (!user || !courseId) return "/";
    if (user.role === "lecturer") {
      return `/lecturer/courses/${courseId}/${page}`;
    } else {
      return `/student/courses/${courseId}/${page}`;
    }
  };

  const value = {
    user,
    login,
    logout,
    getRoleBasedRoute,
    getCourseRoute,
    isLoggedIn: !!user,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
