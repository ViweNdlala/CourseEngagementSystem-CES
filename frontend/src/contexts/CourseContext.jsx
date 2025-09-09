/* This manages the current course state across the app*/

import React, { createContext, useContext, useState } from "react";

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

  const selectCourse = (course) => {
    setCurrentCourse(course);
  };

  const clearCourse = () => {
    setCurrentCourse(null);
  };

  const value = {
    currentCourse,
    selectCourse,
    clearCourse,
    isInCourse: !!currentCourse,
  };

  return (
    <CourseContext.Provider value={value}>{children}</CourseContext.Provider>
  );
};
