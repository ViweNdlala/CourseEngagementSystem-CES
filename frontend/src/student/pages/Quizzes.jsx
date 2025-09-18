import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useCourse } from "../../contexts/CourseContext";

export default function Quizzes() {
  const { currentCourse ,activeSession, withinGeofence, locationChecked} = useCourse();

  const [quizzes, setQuizzes] = useState([]);
  const [expandedQuiz, setExpandedQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [grades, setGrades] = useState({});
  const [submitted, setSubmitted] = useState({});
  const [attemptsTaken, setAttemptsTaken] = useState({}); // Track attempts per quiz
  const [loading, setLoading] = useState(true);
  const [timers, setTimers] = useState({});
  const intervalRefs = useRef({});

  // Fetch quizzes
   // Determine if student can access quizzes
  const canAccessQuizzes = activeSession && withinGeofence && locationChecked;

  // Fetch quizzes when course changes
  useEffect(() => {
    if (!currentCourse) return;

    setLoading(true);
    axios
      .get(`http://127.0.0.1:8000/quizzes/quizzes/?course=${currentCourse.id}`)
      .then((res) => {
        setQuizzes(res.data);

        // Initialize attemptsTaken from backend if included
        const attemptsMap = {};
        res.data.forEach(q => {
          // assuming backend returns attemptsTaken field (or can default to 0)
          attemptsMap[q.id] = q.attempts_taken || 0;
        });
        setAttemptsTaken(attemptsMap);
      })
      .catch((err) => console.error("Failed to fetch quizzes:", err))
      .finally(() => setLoading(false));
  }, [currentCourse]);

  // Expand/collapse quiz and start timer
  const toggleExpand = (quiz) => {
    if (expandedQuiz === quiz.id) {
      clearInterval(intervalRefs.current[quiz.id]);
      setExpandedQuiz(null);
    } else {
      setExpandedQuiz(quiz.id);
      setGrades({});
      setSubmitted({});

      if (quiz.timer && quiz.timer > 0) {
        setTimers((prev) => ({ ...prev, [quiz.id]: quiz.timer * 60 }));
        clearInterval(intervalRefs.current[quiz.id]);
        intervalRefs.current[quiz.id] = setInterval(() => {
          setTimers((prev) => {
            if (prev[quiz.id] <= 1) {
              clearInterval(intervalRefs.current[quiz.id]);
              handleSubmit(quiz.id, quiz.questions);
              return { ...prev, [quiz.id]: 0 };
            }
            return { ...prev, [quiz.id]: prev[quiz.id] - 1 };
          });
        }, 1000);
      }
    }
  };

  // Track selected answer
  const handleAnswerChange = (questionId, answerId) => {
    setAnswers({ ...answers, [questionId]: answerId });
  };

  // Submit quiz
  // Grade quiz when submitted
  const handleSubmit = (quizId, questions) => {
    // Enforce attempt limit
    const quiz = quizzes.find(q => q.id === quizId);
    if (quiz.attempts > 0 && attemptsTaken[quizId] >= quiz.attempts) {
      alert("You have reached the maximum number of attempts for this quiz.");
      return;
    }

    if (submitted[quizId]) return;

    let correctCount = 0;
    questions.forEach((q) => {
      const chosenAnswer = q.answers.find((a) => a.id === answers[q.id]);
      const correctAnswer = q.answers.find((a) => a.is_correct);
      if (chosenAnswer?.id === correctAnswer?.id) correctCount++;
    });

    const grade = {
      total: questions.length,
      correct: correctCount,
      percentage: Math.round((correctCount / questions.length) * 100),
    };

    setGrades({ ...grades, [quizId]: grade });
    setSubmitted({ ...submitted, [quizId]: true });

    // Increment attempts
    setAttemptsTaken({ ...attemptsTaken, [quizId]: (attemptsTaken[quizId] || 0) + 1 });

    clearInterval(intervalRefs.current[quizId]);
  };

  // Filter only quizzes visible to students
  const visibleQuizzes = quizzes.filter((q) => q.is_visible);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  if (loading) return <p>Loading quizzes...</p>;

  if (!canAccessQuizzes) {
    return (
      <div className="quizzes">
        <h2>Quizzes</h2>
        <p style={{ color: "red", marginTop: "1rem" }}>
           You must be within the geofence and have an active session to view quizzes
        </p>
      </div>
    );
  }

  if (visibleQuizzes.length === 0) return <p>No quizzes found.</p>;

  return (
    <div className="quizzes">
      <h2>Quizzes</h2>
      {visibleQuizzes.map((quiz) => (
        <div
          key={quiz.id}
          style={{ border: "1px solid black", marginBottom: "15px", padding: "10px" }}
        >
          <div
            style={{ cursor: "pointer", padding: "10px" }}
            onClick={() => toggleExpand(quiz)}
            className="quiz-toggle"
          >
            <h3>{quiz.title}</h3>

            {/* Show attempts */}
            <p>
              Attempts: {attemptsTaken[quiz.id] || 0} /{" "}
              {quiz.attempts === 0 ? "Unlimited" : quiz.attempts}
            </p>

            {quiz.timer > 0 && expandedQuiz === quiz.id && (
              <p>Time remaining: {formatTime(timers[quiz.id] || quiz.timer * 60)}</p>
            )}
          </div>

          {expandedQuiz === quiz.id && (
            <div style={{ padding: "10px" }}>
              {quiz.questions.map((q, index) => {
                const correctAnswer = q.answers.find((a) => a.is_correct);
                const selectedAnswerId = answers[q.id];

                return (
                  <div key={q.id} style={{ marginBottom: "15px" }}>
                    <p>
                      <strong>Question {index + 1}:</strong> {q.text}
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
                            mark = " correct";
                          } else if (isSelected && !isCorrect) {
                            labelStyle = { color: "red" };
                            mark = " incorrect";
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
                disabled={
                  submitted[quiz.id] ||
                  (quiz.attempts > 0 && attemptsTaken[quiz.id] >= quiz.attempts)
                }
              >
                Submit
              </button>

              {grades[quiz.id] && (
                <div style={{ marginTop: "15px", borderTop: "1px solid #ddd", paddingTop: "10px" }}>
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
