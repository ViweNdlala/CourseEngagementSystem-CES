import React, { useEffect, useState } from "react";
import axios from "axios";
import { useCourse } from "../../contexts/CourseContext";
import  {useUser} from "../../contexts/CourseContext";

export default function Quizzes() {
  const { currentCourse } = useCourse();

  const [quizzes, setQuizzes] = useState([]);
  const [expandedQuiz, setExpandedQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [grades, setGrades] = useState({});
  const [submitted, setSubmitted] = useState({});
  const [loading, setLoading] = useState(true);

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
    setGrades({});
    setSubmitted({});
  };

  const handleAnswerChange = (questionId, answerId) => {
    setAnswers({ ...answers, [questionId]: answerId });
  };

  const handleSubmit = (quizId, questions) => {
    if (submitted[quizId]) return;

    let correctCount = 0;

    questions.forEach((q) => {
      const chosenAnswer = q.answers.find((a) => a.id === answers[q.id]);
      const correctAnswer = q.answers.find((a) => a.is_correct);

      if (chosenAnswer?.id === correctAnswer?.id) {
        correctCount++;
      }
    });

    const grade = {
      total: questions.length,
      correct: correctCount,
      percentage: Math.round((correctCount / questions.length) * 100),
    };

    setGrades({ ...grades, [quizId]: grade });
    setSubmitted({ ...submitted, [quizId]: true });
  };

  if (loading) return <p>Loading quizzes...</p>;
  if (quizzes.length === 0) return <p>No quizzes found.</p>;

  return (
    <div className="quizzes">
      <h2>Quizzes</h2>
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
            <h3>{quiz.title}</h3>
          </div>

          {expandedQuiz === quiz.id && (
            <div style={{ padding: "10px" }}>
              {quiz.questions.map((q, index) => {  // <- added index
                const correctAnswer = q.answers.find((a) => a.is_correct);
                const selectedAnswerId = answers[q.id];

                return (
                  <div key={q.id} style={{ marginBottom: "15px" }}>
                    <p>
                      <strong>Question {index + 1}:</strong> {q.text}  {/* <- show number */}
                    </p>
                    <ul>
                      {q.answers.map((a) => {
                        const isCorrect = a.id === correctAnswer?.id;
                        const isSelected = selectedAnswerId === a.id;

                        let labelStyle = {};
                        let mark = "";
                        let checked = isSelected;

                        if (submitted[quiz.id]) {
                          if (isCorrect) {
                            labelStyle = { color: "green" };
                            mark = " ✔";
                            checked = isSelected;
                          } else if (isSelected && !isCorrect) {
                            labelStyle = { color: "red" };
                            mark = "✖";
                          }
                        }

                        return (
                          <li key={a.id}>
                            <label style={labelStyle}>
                              <input
                                type="radio"
                                name={`question-${q.id}`}
                                value={a.id}
                                checked={checked}
                                onChange={() => handleAnswerChange(q.id, a.id)}
                                disabled={submitted[quiz.id]}
                              />
                              {a.text}
                              {mark}
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}

              <button
                onClick={() => handleSubmit(quiz.id, quiz.questions)}
                disabled={submitted[quiz.id]}
              >
                Submit
              </button>

              {grades[quiz.id] && (
                <div
                  style={{
                    marginTop: "15px",
                    borderTop: "1px solid #ddd",
                    paddingTop: "10px",
                  }}
                >
                  <h4>Grade Summary</h4>
                  <p>
                    Mark: {grades[quiz.id].correct}/{grades[quiz.id].total}
                  </p>
                  <p>
                    Grade: <strong>{grades[quiz.id].percentage}%</strong>
                  </p>
                </div>
              )}
            </div>
          )}

        </div>
      ))}
    </div>
  );
}
