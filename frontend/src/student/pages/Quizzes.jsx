import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useCourse } from "../../contexts/CourseContext";
import "../styles/Quizzes.css";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

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

  const [quizPerformance, setQuizPerformance] = useState([]);

  const canAccessQuizzes = activeSession && withinGeofence && locationChecked;

  // Fetch student ID and quizzes
  useEffect(() => {
    if (!currentCourse) return;
    setLoading(true);

    axios
      .get(`http://127.0.0.1:8000/enrollments/?course=${currentCourse.id}`)
      .then((res) => {
        if (res.data.length > 0) setStudentId(res.data[0].student);
      })
      .catch((err) => console.error(err));

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
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [currentCourse]);

  // Fetch performance for graph from backend (highest attempt per quiz)
  const fetchPerformance = () => {
    if (!studentId) return;

    axios
      .get(`http://127.0.0.1:8000/quizzes/attempts/user-performance/${studentId}/`)
      .then((res) => {
        // Map all quizzes, showing 0% for non-attempted ones
        const performanceData = quizzes.map((q) => {
          const perf = res.data.find((p) => p.quiz === q.id);
          return {
            quiz: q.title,
            grade: perf ? perf.percentage : 0, // Show 0 instead of null for non-attempted
          };
        });
        setQuizPerformance(performanceData);
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchPerformance();
  }, [studentId, quizzes]);

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
    if (!studentId || submitted[quiz.id]) return;

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

    try {
      await axios.post("http://127.0.0.1:8000/quizzes/attempts/", {
        quiz_id: quiz.id,
        user_id: studentId,
        score: correctCount,
        max_score: quiz.questions.length,
      });

      // Refresh backend data for graph (highest score now)
      fetchPerformance();
    } catch (err) {
      console.error(err);
    }
  };

  const visibleQuizzes = quizzes.filter((q) => q.is_visible);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const grade = payload[0].value;
      return (
        <div className="custom-tooltip">
          <p>{label}</p>
          <p>Grade: {grade}%</p>
        </div>
      );
    }
    return null;
  };

  if (loading) return <p>Loading quizzes...</p>;
  if (!canAccessQuizzes)
    return (
      <div className="quizzes">
        <h2>Quizzes</h2>
        <p className="error-msg">
          You must be within the geofence and have an active session to view quizzes
        </p>
      </div>
    );

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

      {quizPerformance.length > 0 && (
        <div className="quiz-graph">
          <h3>Quiz Performances</h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={quizPerformance} margin={{ top: 20, right: 30, left: 30, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="quiz" 
                // angle={-45}
                angle={-55}
                textAnchor="end"
                height={100}
                interval={0}
                label={{ value: '', position: 'insideBottom', offset: -10 }}
              />
              <YAxis 
                domain={[0, 100]} 
                ticks={[0, 25, 50, 75, 100]}
                label={{ value: 'Grade', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line type="monotone" dataKey="grade" stroke="#8884d8" connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}