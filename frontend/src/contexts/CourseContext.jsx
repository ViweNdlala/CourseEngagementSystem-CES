/* This manages the current course state across the app*/

import React, { createContext, useContext, useState ,useEffect} from "react";

const CourseContext = createContext();


export const useCourse = () => {
  const context = useContext(CourseContext);
  if (!context) {
    throw new Error("useCourse must be used within a CourseProvider");
  }
  return context;
};

export const CourseProvider = ({ children }) => {
  const [currentCourse, setCurrentCourse] = useState(null);
  const [activeSession, setActiveSession] = useState(null); // add session
  const [withinGeofence, setWithinGeofence] = useState(null); // add geofence state
  const [locationChecked, setLocationChecked] = useState(false);

    // Rehydrate from localStorage
  useEffect(() => {
    const storedCourse = localStorage.getItem("currentCourse");
    const storedSession = localStorage.getItem("activeSession");
    const storedGeofence = localStorage.getItem("withinGeofence");
    const storedChecked = localStorage.getItem("locationChecked");

    if (storedCourse) setCurrentCourse(JSON.parse(storedCourse));
    if (storedSession) setActiveSession(JSON.parse(storedSession));
    if (storedGeofence) setWithinGeofence(JSON.parse(storedGeofence));
    if (storedChecked) setLocationChecked(JSON.parse(storedChecked));
  }, []);

  useEffect(() => {
    if (currentCourse) localStorage.setItem("currentCourse", JSON.stringify(currentCourse));
    else localStorage.removeItem("currentCourse");
  }, [currentCourse]);

  useEffect(() => {
    if (activeSession) localStorage.setItem("activeSession", JSON.stringify(activeSession));
    else localStorage.removeItem("activeSession");
  }, [activeSession]);

  useEffect(() => {
    if (withinGeofence !== null) localStorage.setItem("withinGeofence", JSON.stringify(withinGeofence));
    else localStorage.removeItem("withinGeofence");
  }, [withinGeofence]);

   useEffect(() => {
    localStorage.setItem("locationChecked", JSON.stringify(locationChecked));
  }, [locationChecked]);


  const selectCourse = (course) => {
    setCurrentCourse(course);
  };

  const clearCourse = () => {
    setCurrentCourse(null);
    setActiveSession(null);
    setWithinGeofence(null);
    setLocationChecked(false);
  };

  const value = {
    currentCourse,
    selectCourse,
    clearCourse,
    activeSession,
    setActiveSession,
    withinGeofence,
    setWithinGeofence,
    locationChecked,
    setLocationChecked,
    isInCourse: !!currentCourse,
  };

  return (
    <CourseContext.Provider value={value}>{children}</CourseContext.Provider>
  );
};
