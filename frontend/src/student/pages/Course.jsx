import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

export default function Course() {
  const { id } = useParams(); // get course id from URL
  const [course, setCourse] = useState(null);

  useEffect(() => {
    axios
      .get(`http://localhost:8000/courses/${id}/`)
      .then((res) => setCourse(res.data))
      .catch((err) => console.error(err));
  }, [id]);

  if (!course) return <p>Loading course...</p>;

  return (
    <div>
      <h1>{course.name}</h1>
      <p>{course.description}</p>
      <p><strong>Location:</strong> {course.location}</p>
    </div>
  );
}
