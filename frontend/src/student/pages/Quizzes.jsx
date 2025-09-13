import React, { useEffect, useState } from "react";
import axios from "axios";

export default function Quizzes() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch all quizzes
    axios.get("http://127.0.0.1:8000/quizzes/quizzes/")
      .then(res => {
        setQuizzes(res.data);
      })
      .catch(err => console.error("Failed to fetch quizzes:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading quizzes...</p>;
  if (quizzes.length === 0) return <p>No quizzes found.</p>;

  return (
    <div>
      <h1>All Quizzes</h1>
      <ul>
        {quizzes.map((quiz) => (
          <li key={quiz.id}>
            <h2>{quiz.title}</h2>
            <p>Course: {quiz.course}</p>
            <p>Author: {quiz.author}</p>
            <p>Questions: {quiz.questions.length}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
