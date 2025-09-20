import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useCourse } from "../../contexts/CourseContext";
import "../styles/Quizzes.css";

export default function Quizzes() {
  const { currentCourse, activeSession, withinGeofence, locationChecked } = useCourse();

  const [quizzes, setQuizzes] = useState([]);
  const [expandedQuiz, setExpandedQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [grades, setGrades] = useState({});
  const [submitted, setSubmitted] = useState({});
  const [attemptsTaken, setAttemptsTaken] = useState({});
  const [loading, setLoading] = useState(true);
  const [timers, setTimers] = useState({});
  const intervalRefs = useRef({});
  const [studentId, setStudentId] = useState(null);

  const canAccessQuizzes = activeSession && withinGeofence && locationChecked;

  useEffect(() => {
    if (!currentCourse) return;

    setLoading(true);

    // Fetch student enrollment to get user_id
    axios
      .get(`http://127.0.0.1:8000/enrollments/?course=${currentCourse.id}`)
      .then((res) => {
        if (res.data.length > 0) {
          setStudentId(res.data[0].student); // assumes first enrolled student is current
        }
      })
      .catch((err) => console.error("Failed to fetch enrollment:", err));

    // Fetch quizzes
    axios
      .get(`http://127.0.0.1:8000/quizzes/quizzes/?course=${currentCourse.id}`)
      .then((res) => {
        setQuizzes(res.data);
        const attemptsMap = {};
        res.data.forEach((q) => {
          attemptsMap[q.id] = q.attempts_taken || 0;
        });
        setAttemptsTaken(attemptsMap);
      })
      .catch((err) => console.error("Failed to fetch quizzes:", err))
      .finally(() => setLoading(false));
  }, [currentCourse]);

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
              handleSubmit(quiz);
              return { ...prev, [quiz.id]: 0 };
            }
            return { ...prev, [quiz.id]: prev[quiz.id] - 1 };
          });
        }, 1000);
      }
    }
  };

  const handleAnswerChange = (questionId, answerId) => {
    setAnswers({ ...answers, [questionId]: answerId });
  };

  const handleSubmit = async (quiz) => {
    if (!studentId) {
      console.error("No student ID found for current course.");
      return;
    }

    if (submitted[quiz.id]) return;

    let correctCount = 0;
    quiz.questions.forEach((q) => {
      const chosenAnswer = q.answers.find((a) => a.id === answers[q.id]);
      const correctAnswer = q.answers.find((a) => a.is_correct);
      if (chosenAnswer?.id === correctAnswer?.id) correctCount++;
    });

    const grade = {
      total: quiz.questions.length,
      correct: correctCount,
      percentage: Math.round((correctCount / quiz.questions.length) * 100),
    };

    setGrades({ ...grades, [quiz.id]: grade });
    setSubmitted({ ...submitted, [quiz.id]: true });
    setAttemptsTaken({ ...attemptsTaken, [quiz.id]: (attemptsTaken[quiz.id] || 0) + 1 });

    clearInterval(intervalRefs.current[quiz.id]);

    try {
      const response = await axios.post("http://127.0.0.1:8000/quizzes/attempts/", {
        quiz_id: quiz.id,
        user_id: studentId,
        score: correctCount,
        max_score: quiz.questions.length,
      });
      console.log("Attempt recorded:", response.data);
    } catch (error) {
      console.error("Failed to record attempt:", error.response?.data || error);
    }
  };

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
        <p className="error-msg">
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
        <div key={quiz.id} className="quiz-card">
          <div className="quiz-header" onClick={() => toggleExpand(quiz)}>
            <h3>{quiz.title}</h3>
            <div className="quiz-settings">
              <span>
                Attempts: {attemptsTaken[quiz.id] || 0} /{" "}
                {quiz.attempts === 0 ? "Unlimited" : quiz.attempts}
              </span>
              {quiz.timer > 0 && expandedQuiz === quiz.id && (
                <span>Time: {formatTime(timers[quiz.id] || quiz.timer * 60)}</span>
              )}
            </div>
          </div>

          {expandedQuiz === quiz.id && (
            <div className="quiz-body">
              {quiz.questions.map((q, index) => {
                const correctAnswer = q.answers.find((a) => a.is_correct);
                const selectedAnswerId = answers[q.id];

                return (
                  <div key={q.id} className="quiz-question">
                    <strong>Question {index + 1}:</strong> {q.text}
                    <ul className="answer-list">
                      {q.answers.map((a) => {
                        const isCorrect = a.id === correctAnswer?.id;
                        const isSelected = selectedAnswerId === a.id;

                        let labelClass = "";
                        let mark = "";

                        if (submitted[quiz.id]) {
                          if (isCorrect) {
                            labelClass = "answer-correct";
                            mark = " correct";
                          } else if (isSelected && !isCorrect) {
                            labelClass = "answer-wrong";
                            mark = " incorrect";
                          }
                        }

                        return (
                          <li key={a.id}>
                            <label className={labelClass}>
                              <input
                                type="radio"
                                name={`question-${q.id}`}
                                value={a.id}
                                checked={isSelected}
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
                className="btn"
                onClick={() => handleSubmit(quiz)}
                disabled={
                  submitted[quiz.id] ||
                  (quiz.attempts > 0 && attemptsTaken[quiz.id] >= quiz.attempts)
                }
              >
                Submit
              </button>

              {grades[quiz.id] && (
                <div className="grade-summary">
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
