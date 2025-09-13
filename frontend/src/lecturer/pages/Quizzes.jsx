import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useCourse } from "../../contexts/CourseContext";
import axios from "axios";

// Component: create quizz
function CreateQuiz({ courseId }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    axios
      .post("http://localhost:8000/quizzes/", {
        title,
        description,
        course: courseId,
      })
      .then(() => {
        alert("Quiz created successfully!");
        setTitle("");
        setDescription("");
      })
      .catch((err) => console.error("Failed to create quiz:", err));
  };

  return (
    <div>
      <h2>Create a New Quiz</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Quiz title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <textarea
          placeholder="Quiz description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button type="submit">Create Quiz</button>
      </form>
    </div>
  );
}

// Component: past quizzes
function QuizTable({ courseId }) {
  const [quizzes, setQuizzes] = useState([]);

  useEffect(() => {
    axios
      .get(`http://localhost:8000/courses/${courseId}/quizzes/`)
      .then((res) => setQuizzes(res.data))
      .catch((err) => console.error("Failed to load quizzes:", err));
  }, [courseId]);

  return (
    <div>
      <h2>Past Quizzes</h2>
      {quizzes.length === 0 ? (
        <p>No quizzes yet.</p>
      ) : (
        <table border="1" cellPadding="8">
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Created At</th>
              <th>Questions</th>
            </tr>
          </thead>
          <tbody>
            {quizzes.map((quiz) => (
              <tr key={quiz.id}>
                <td>{quiz.id}</td>
                <td>{quiz.title}</td>
                <td>{quiz.created_at}</td>
                <td>{quiz.question_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function Quizzes() {
  const { id } = useParams();
  const { currentCourse, selectCourse } = useCourse();
  const [course, setCourse] = useState(currentCourse);
  const [loading, setLoading] = useState(!currentCourse);

  useEffect(() => {
    if (!currentCourse && id) {
      axios
        .get(`http://localhost:8000/courses/${id}/`)
        .then((res) => {
          setCourse(res.data);
          selectCourse(res.data);
        })
        .catch((err) => console.error("Failed to fetch course:", err))
        .finally(() => setLoading(false));
    }
  }, [id, currentCourse, selectCourse]);

  if (loading) return <p>Loading quiz management...</p>;
  if (!course) return <p>Course not found.</p>;

  return (
    <div>
      {/* Quiz management section */}
      <CreateQuiz courseId={course.id} />
      <QuizTable courseId={course.id} />

      {/* Existing heading */}
      <h1>Lecturer Quizzes for {course.title}</h1>
    </div>
  );
}
