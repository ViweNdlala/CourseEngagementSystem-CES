import React, { useEffect, useState } from "react";
import axios from "axios";
import { useCourse } from "../../contexts/CourseContext";

export default function Quizzes() {
  const { currentCourse } = useCourse();

  const [quizzes, setQuizzes] = useState([]);
  const [expandedQuiz, setExpandedQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentCourse) return;

    setLoading(true);
    axios
      .get(`http://127.0.0.1:8000/quizzes/quizzes/?course=${currentCourse.id}`)
      .then((res) => setQuizzes(res.data))
      .catch((err) => console.error("Failed to fetch quizzes:", err))
      .finally(() => setLoading(false));
  }, [currentCourse]);

  const toggleExpand = (quizId) => {
    setExpandedQuiz(expandedQuiz === quizId ? null : quizId);
  };

  const handleCorrectAnswerChange = (quizId, questionId, answerId) => {
    setQuizzes((prev) =>
      prev.map((quiz) =>
        quiz.id === quizId
          ? {
              ...quiz,
              questions: quiz.questions.map((q) =>
                q.id === questionId
                  ? {
                      ...q,
                      answers: q.answers.map((a) => ({
                        ...a,
                        is_correct: a.id === answerId,
                      })),
                    }
                  : q
              ),
            }
          : quiz
      )
    );
  };

  const handleVisibilityToggle = (quizId) => {
    setQuizzes((prev) =>
      prev.map((quiz) =>
        quiz.id === quizId ? { ...quiz, is_visible: !quiz.is_visible } : quiz
      )
    );
  };

  const handleSave = async (quiz) => {
    setSaving(true);
    try {
      await axios.patch(`http://127.0.0.1:8000/quizzes/quizzes/${quiz.id}/`, {
        is_visible: quiz.is_visible,
        questions: quiz.questions.map((q) => ({
          id: q.id,
          correct_answer: q.answers.find((a) => a.is_correct)?.id,
        })),
      });
      alert("Changes saved successfully!");
    } catch (err) {
      console.error("Failed to save quiz:", err);
      alert("Error saving quiz changes.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p>Loading quizzes...</p>;
  if (quizzes.length === 0) return <p>No quizzes found.</p>;

  return (
    <div className="quizzes">
      <h2>Lecturer Quizzes</h2>
      {quizzes.map((quiz) => (
        <div
          key={quiz.id}
          style={{
            border: "1px solid black",
            marginBottom: "15px",
            padding: "10px",
          }}
        >
          <div
            style={{ cursor: "pointer", padding: "10px" }}
            onClick={() => toggleExpand(quiz.id)}
          >
            <h3>
              {quiz.title}{" "}
              <span style={{ fontSize: "0.8rem", marginLeft: "10px" }}>
                ({quiz.is_visible ? "Visible to students" : "Hidden from students"})
              </span>
            </h3>
          </div>

          {expandedQuiz === quiz.id && (
            <div style={{ padding: "10px" }}>
              <div style={{ marginBottom: "15px" }}>
                <label>
                  <input
                    type="checkbox"
                    checked={quiz.is_visible}
                    onChange={() => handleVisibilityToggle(quiz.id)}
                  />{" "}
                  Visible to students
                </label>
              </div>

              {quiz.questions.map((q, index) => {
                const correctAnswer = q.answers.find((a) => a.is_correct);
                return (
                  <div key={q.id} style={{ marginBottom: "15px" }}>
                    <p>
                      <strong>Question {index + 1}:</strong> {q.text}
                    </p>
                    <ul>
                      {q.answers.map((a) => (
                        <li key={a.id}>
                          <label>
                            <input
                              type="radio"
                              name={`question-${q.id}`}
                              value={a.id}
                              checked={a.id === correctAnswer?.id}
                              onChange={() =>
                                handleCorrectAnswerChange(quiz.id, q.id, a.id)
                              }
                            />
                            {a.text}
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}

              <button
                onClick={() => handleSave(quiz)}
                disabled={saving}
                style={{ marginTop: "10px" }}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
