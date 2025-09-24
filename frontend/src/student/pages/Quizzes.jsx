/**
 * Quizzes.jsx
 * 
 * Purpose:
 * React component that displays and manages quizzes for a logged-in student.
 * - Fetches quizzes from the backend based on the current course.
 * - Handles quiz expansion, answering questions, submitting answers, and grading.
 * - Displays student performance over time with a chart.
 */

import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useCourse } from "../../contexts/CourseContext";
import { useUser } from "../../contexts/UserContext";  // provides logged-in user data
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
  // Context hooks
  const { currentCourse, activeSession, withinGeofence, locationChecked } = useCourse();
  const { user } = useUser(); // Logged-in student

  // State variables
  const [quizzes, setQuizzes] = useState([]);              // List of quizzes
  const [expandedQuiz, setExpandedQuiz] = useState(null);  // Currently opened quiz
  const [answers, setAnswers] = useState({});              // Selected answers
  const [grades, setGrades] = useState({});                // Student grades per quiz
  const [submitted, setSubmitted] = useState({});          // Track submitted quizzes
  const [attemptsTaken, setAttemptsTaken] = useState({});  // Attempts already made
  const [loading, setLoading] = useState(true);            // Loading state
  const [timers, setTimers] = useState({});                // Countdown timers
  const intervalRefs = useRef({});                         // Store timer intervals
  const [quizPerformance, setQuizPerformance] = useState([]); // Student quiz performance

  // Student can only access quizzes under these conditions
  const canAccessQuizzes = activeSession && withinGeofence && locationChecked;

  /**
   * Fetch quizzes for the selected course.
   */
  useEffect(() => {
    if (!currentCourse) return;
    setLoading(true);

    axios
      .get(`http://127.0.0.1:8000/quizzes/quizzes/?course=${currentCourse.id}`)
      .then((res) => {
        setQuizzes(res.data);
        // Map attempts taken per quiz
        const attemptsMap = {};
        res.data.forEach((q) => {
          attemptsMap[q.id] = q.attempts_taken || 0;
        });
        setAttemptsTaken(attemptsMap);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [currentCourse]);

  /**
   * Fetch performance (grades) for the logged-in student.
   */
  const fetchPerformance = () => {
    if (!user?.id) return; // Ensure student exists
    axios
      .get(`http://127.0.0.1:8000/quizzes/attempts/user-performance/${user.id}/`)
      .then((res) => {
        // Match quiz IDs to performance
        const performanceData = quizzes.map((q) => {
          const perf = res.data.find((p) => p.quiz === q.id);
          return {
            quiz: q.title,
            grade: perf ? perf.percentage : 0,
          };
        });
        setQuizPerformance(performanceData);
      })
      .catch((err) => console.error(err));
  };

  // Fetch performance whenever user or quizzes change
  useEffect(() => {
    fetchPerformance();
  }, [user?.id, quizzes]);

  /**
   * Toggle expanding/collapsing quiz.
   * If expanded, start timer (if quiz has one).
   */
  const toggleExpand = (quiz) => {
    if (expandedQuiz === quiz.id) {
      // Collapse quiz and stop timer
      clearInterval(intervalRefs.current[quiz.id]);
      setExpandedQuiz(null);
    } else {
      // Open quiz
      setExpandedQuiz(quiz.id);
      setGrades({});
      setSubmitted({});
      if (quiz.timer && quiz.timer > 0) {
        // Initialize countdown
        setTimers((prev) => ({ ...prev, [quiz.id]: quiz.timer * 60 }));
        clearInterval(intervalRefs.current[quiz.id]);
        intervalRefs.current[quiz.id] = setInterval(() => {
          setTimers((prev) => {
            if (prev[quiz.id] <= 1) {
              // Auto-submit when time runs out
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

  /**
   * Record student’s selected answer for a question.
   */
  const handleAnswerChange = (questionId, answerId) => {
    setAnswers({ ...answers, [questionId]: answerId });
  };

  /**
   * Submit quiz answers, calculate grade, and store attempt in backend.
   */
  const handleSubmit = async (quiz) => {
    if (!user?.id || submitted[quiz.id]) return;

    // Count correct answers
    let correctCount = 0;
    quiz.questions.forEach((q) => {
      const chosenAnswer = q.answers.find((a) => a.id === answers[q.id]);
      const correctAnswer = q.answers.find((a) => a.is_correct);
      if (chosenAnswer?.id === correctAnswer?.id) correctCount++;
    });

    // Compute grade
    const grade = {
      total: quiz.questions.length,
      correct: correctCount,
      percentage: Math.round((correctCount / quiz.questions.length) * 100),
    };

    // Update local state
    setGrades({ ...grades, [quiz.id]: grade });
    setSubmitted({ ...submitted, [quiz.id]: true });

    try {
      // Send attempt to backend
      await axios.post("http://127.0.0.1:8000/quizzes/attempts/", {
        quiz_id: quiz.id,
        user_id: user.id,
        score: correctCount,
        max_score: quiz.questions.length,
      });

      // Refresh performance graph
      fetchPerformance();
    } catch (err) {
      console.error(err);
    }
  };

  // Only display quizzes marked visible by lecturer
  const visibleQuizzes = quizzes.filter((q) => q.is_visible);

  /**
   * Format time (MM:SS) for countdown display.
   */
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  /**
   * Custom tooltip for performance graph.
   */
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

  // Loading state
  if (loading) return <p>Loading quizzes...</p>;

  // Access restrictions
  if (!canAccessQuizzes)
    return (
      <div className="quizzes">
        <h2>Quizzes</h2>
        <p className="error-msg">
          You must be within the geofence and have an active session to view quizzes
        </p>
      </div>
    );

  // No quizzes found
  if (visibleQuizzes.length === 0) return <p>No quizzes found.</p>;

  return (
    <div className="quizzes">
      <h2>Quizzes</h2>

      {/* Quiz List */}
      {visibleQuizzes.map((quiz) => (
        <div key={quiz.id} className="quiz-card">
          {/* Quiz Header */}
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

          {/* Expanded Quiz Body */}
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

                        // Show correctness after submission
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

              {/* Submit button */}
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

              {/* Grade Summary */}
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

      {/* Performance Graph */}
      {quizPerformance.length > 0 && (
        <div className="quiz-graph">
          <h3>Quiz Performances</h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={quizPerformance} margin={{ top: 20, right: 30, left: 30, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="quiz"
                interval={0}
                tickFormatter={(label) => label.split(":")[0]} // shorten labels
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                label={{ value: "Grade", angle: -90, position: "insideLeft" }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="grade" stroke="#8884d8" connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
