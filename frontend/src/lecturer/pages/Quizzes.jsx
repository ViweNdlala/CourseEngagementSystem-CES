/**
 * Quizzes.jsx
 * Purpose: Manage quizzes for a course. Provides functionality for:
 * - Fetching and displaying quizzes
 * - Creating new quizzes (lecturer only)
 * - Updating existing quizzes
 * - Visualizing quiz performance with charts
 * - Viewing underperforming students and individual student performance
 */



import React, { useEffect, useState, useCallback } from "react";
import { useCourse } from "../../contexts/CourseContext";
import { useUser } from "../../contexts/UserContext";
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
  // Context hooks for course and user data
  const { currentCourse } = useCourse();
  const { user, axios } = useUser();

  // State for quizzes data and UI
  const [quizzes, setQuizzes] = useState([]);
  const [expandedQuiz, setExpandedQuiz] = useState(null);
  const [loading, setLoading] = useState(true);

  // State for new quiz creation
  const [newQuiz, setNewQuiz] = useState({
    title: "",
    timer: 0,
    attempts: 0,
    questions: [{ text: "", answers: [{ text: "", is_correct: false }] }],
  });
  const [creating, setCreating] = useState(false);
  
  // Alert system state
  const [alertMessage, setAlertMessage] = useState(null);
  const [alertPosition, setAlertPosition] = useState({ top: 0, left: 0 });

  // Graph and performance tracking states
  const [quizPerformance, setQuizPerformance] = useState([]);
  const [clickedDataPoint, setClickedDataPoint] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentPerformance, setStudentPerformance] = useState([]);
  const [enrolledStudents, setEnrolledStudents] = useState([]);

  /**
   * Displays a temporary alert message near the action element
   * @param {string} message - The alert message to display
   * @param {string} type - Alert type: "success" or "error"
   * @param {HTMLElement} element - The DOM element to position the alert near
   */
  const showAlert = (message, type = "success", element = null) => {
    if (element) {
      const rect = element.getBoundingClientRect();
      setAlertPosition({
        top: rect.bottom + window.scrollY + 10,
        left: rect.left + window.scrollX
      });
    }
    
    setAlertMessage({ message, type });
    setTimeout(() => {
      setAlertMessage(null);
    }, 3000); // Hide after 3 seconds
  };

  // Fetch quizzes for the current course
  useEffect(() => {
    if (!currentCourse) return;
    setLoading(true);
    axios
      .get(`/quizzes/quizzes/?course=${currentCourse.id}`)
      .then((res) => setQuizzes(res.data))
      .catch((err) => console.error("Failed to fetch quizzes:", err))
      .finally(() => setLoading(false));
  }, [currentCourse]);

  // Fetch enrolled students for the current course
  useEffect(() => {
    if (!currentCourse) return;
    
    axios
      .get(`/enrollments/`)
      .then((res) => {
        const enrollments = res.data || [];
        // Filter enrollments for current course
        const courseEnrollments = enrollments.filter(
          (enrollment) => enrollment.course === currentCourse.id
        );
        
        // Extract student IDs
        const studentIds = courseEnrollments.map(enrollment => enrollment.student);
        
        // Fetch student details for each enrolled student
        const studentPromises = studentIds.map(studentId => 
          axios.get(`/`)
            .then(res => {
              const users = res.data || [];
              return users.find(user => user.id === studentId);
            })
            .catch(err => {
              console.error("Failed to fetch student:", err);
              return null;
            })
        );
        
        Promise.all(studentPromises).then(students => {
          const validStudents = students.filter(student => student !== null);
          setEnrolledStudents(validStudents);
        });
      })
      .catch((err) => console.error("Failed to fetch enrollments:", err));
  }, [currentCourse]);

  // Fetch performance data for analytics graph
  useEffect(() => {
    if (!currentCourse || quizzes.length === 0 || enrolledStudents.length === 0) return;

    const fetchPerformanceData = async () => {
      const allPerformances = {};
      
      // Initialize performance data structure for all quizzes
      for (const quiz of quizzes) {
        allPerformances[quiz.id] = {
          quiz: quiz.title,
          scores: enrolledStudents.map((student) => ({
            student: student.id,
            name: student.name,
            email: student.email,
            grade: 0,
          })),
        };
      }

      // Fetch performance for each student
      for (const student of enrolledStudents) {
        try {
          const perfRes = await axios.get(
            `/quizzes/attempts/user-performance/${student.id}/`
          );
          
          perfRes.data.forEach((p) => {
            const quizEntry = Object.values(allPerformances).find(
              (q) => q.quiz === p.quiz_title
            );
            if (quizEntry) {
              const studentScore = quizEntry.scores.find(
                (sc) => sc.student === student.id
              );
              if (studentScore) {
                studentScore.grade = p.percentage;
              }
            }
          });
        } catch (err) {
          console.error("Error fetching performance for student:", student, err);
        }
      }

      // Aggregate data for the chart display
      const aggregated = Object.values(allPerformances).map((q, index) => {
        const grades = q.scores.map((s) => s.grade);
        const avg =
          grades.length > 0
            ? Math.round(grades.reduce((a, b) => a + b, 0) / grades.length)
            : 0;
        const underperforming = q.scores.filter((s) => s.grade < 50);
        return {
          quiz: q.quiz,
          quizShort: `Quiz ${index + 1}`,
          avg,
          underperforming: underperforming.map((s) => ({
            name: s.name,
            email: s.email,
            grade: s.grade,
            studentId: s.student,
          })),
        };
      });

      setQuizPerformance(aggregated);
    };

    fetchPerformanceData();
  }, [currentCourse, quizzes, enrolledStudents]);

  /**
   * Toggles the expanded view for a specific quiz
   * @param {number} quizId - The ID of the quiz to expand/collapse
   */
  const toggleExpand = (quizId) => {
    setExpandedQuiz(expandedQuiz === quizId ? null : quizId);
  };

  // Quiz Creation Methods
  
  /**
   * Adds a new question to the quiz being created
   */
  const addQuestion = () => {
    setNewQuiz({
      ...newQuiz,
      questions: [
        ...newQuiz.questions,
        { text: "", answers: [{ text: "", is_correct: false }] },
      ],
    });
  };

  /**
   * Adds a new answer option to a specific question
   * @param {number} qIndex - The index of the question to add the answer to
   */
  const addAnswer = (qIndex) => {
    const updated = [...newQuiz.questions];
    updated[qIndex].answers.push({ text: "", is_correct: false });
    setNewQuiz({ ...newQuiz, questions: updated });
  };

  // Handler methods for quiz form changes
  const handleQuizChange = (field, value) =>
    setNewQuiz({ ...newQuiz, [field]: value });
  
  const handleQuestionChange = (qIndex, value) => {
    const updated = [...newQuiz.questions];
    updated[qIndex].text = value;
    setNewQuiz({ ...newQuiz, questions: updated });
  };
  
  const handleNewAnswerChange = (qIndex, aIndex, field, value) => {
    const updated = [...newQuiz.questions];
    updated[qIndex].answers[aIndex][field] = value;
    setNewQuiz({ ...newQuiz, questions: updated });
  };

  /**
   * Handles quiz creation by sending data to the server
   * @param {Event} e - The form submission event
   */
  const handleCreateQuiz = async (e) => {
    try {
      setCreating(true);
      const validQuestions = newQuiz.questions
        .filter((q) => q.text.trim() !== "")
        .map((q) => ({
          text: q.text,
          answers: q.answers
            .filter((a) => a.text.trim() !== "")
            .map((a) => ({
              text: a.text,
              is_correct: a.is_correct || false,
            })),
        }));

      const payload = {
        title: newQuiz.title || "",
        course: currentCourse?.id || null,
        timer: newQuiz.timer !== undefined ? Number(newQuiz.timer) : 0,
        attempts: newQuiz.attempts,
        is_visible: newQuiz.is_visible ?? false,
        questions: validQuestions,
      };

      const res = await axios.post(
        "/quizzes/quizzes/",
        payload
      );
      setQuizzes([...quizzes, res.data]);
      setNewQuiz({
        title: "",
        timer: 0,
        attempts: 0,
        is_visible: false,
        questions: [{ text: "", answers: [{ text: "", is_correct: false }] }],
      });
      showAlert("Quiz created successfully!", "success", e.target);
    } catch (err) {
      console.error("Failed to create quiz:", err.response?.data || err.message);
      showAlert("Failed to create quiz.", "error", e.target);
    } finally {
      setCreating(false);
    }
  };

  // Quiz Update Methods

  /**
   * Handles quiz updates by sending modified data to the server
   * @param {Object} quiz - The quiz object to update
   * @param {Event} e - The form submission event
   */
  const handleQuizUpdate = async (quiz, e) => {
    const payload = {
      title: quiz.title,
      timer: quiz.timer,
      is_visible: quiz.is_visible,
      attempts: quiz.attempts,
      questions: quiz.questions.map((q) => ({
        id: q.id,
        text: q.text,
        answers: q.answers.map((a) => ({
          id: a.id,
          text: a.text,
          is_correct: a.is_correct,
        })),
      })),
    };
    try {
      const res = await axios.patch(
        `/quizzes/quizzes/${quiz.id}/`,
        payload
      );
      setQuizzes(quizzes.map((q) => (q.id === quiz.id ? res.data : q)));
      showAlert("Quiz updated successfully!", "success", e.target);
    } catch (err) {
      console.error("Failed to update quiz:", err.response?.data || err.message);
      showAlert("Failed to update quiz.", "error", e.target);
    }
  };

  /**
   * Handles student click to display individual performance data
   * @param {number} studentId - The ID of the selected student
   * @param {string} studentName - The name of the selected student
   * @param {string} studentEmail - The email of the selected student
   */
  const handleStudentClick = useCallback(
    async (studentId, studentName, studentEmail) => {
      setSelectedStudent({ 
        id: studentId, 
        name: studentName, 
        email: studentEmail 
      });

      try {
        const perfRes = await axios.get(
          `/quizzes/attempts/user-performance/${studentId}/`
        );
        
        // Create a complete performance record with 0% for quizzes not attempted
        const completePerformance = quizPerformance.map((quiz, index) => {
          const attemptedQuiz = perfRes.data.find(p => p.quiz_title === quiz.quiz);
          return {
            quiz: quiz.quiz,
            quizShort: `Quiz ${index + 1}`,
            grade: attemptedQuiz ? attemptedQuiz.percentage : 0,
          };
        });
        
        setStudentPerformance(completePerformance);
      } catch (err) {
        console.error("Failed to fetch student performance:", err);
        // If there's an error, still show all quizzes with 0%
        const completePerformance = quizPerformance.map((quiz, index) => ({
          quiz: quiz.quiz,
          quizShort: `Quiz ${index + 1}`,
          grade: 0,
        }));
        setStudentPerformance(completePerformance);
      }
    },
    [quizPerformance]
  );

  // Custom Tooltip Components for Charts

  /**
   * Custom tooltip for the main performance chart
   */
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="custom-tooltip">
          <h4>{data.quiz}</h4>
          <p>Average Grade: {data.avg}%</p>
          <p>Underperforming: {data.underperforming?.length || 0}</p>
          <p>Click the point for details</p>
        </div>
      );
    }
    return null;
  };

  /**
   * Custom tooltip for individual student performance chart
   */
  const StudentPerformanceTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="custom-tooltip">
          <h4>{data.quiz}</h4>
          <p>Grade: {data.grade}%</p>
        </div>
      );
    }
    return null;
  };

  // Custom Chart Dot Components

  /**
   * Custom dot component for interactive chart points
   */
  const CustomDot = (props) => {
    const { cx, cy, payload, ...rest } = props;
    
    return (
      <g>
        <circle
          cx={cx}
          cy={cy}
          r={6}
          fill="#8884d8"
          stroke="#fff"
          strokeWidth={2}
          style={{ cursor: 'pointer' }}
          onClick={() => setClickedDataPoint(payload)}
        />
      </g>
    );
  };

  /**
   * Custom active dot component for interactive chart points
   */
  const CustomActiveDot = (props) => {
    const { cx, cy, payload, ...rest } = props;
    
    return (
      <g>
        <circle
          cx={cx}
          cy={cy}
          r={8}
          fill="#8884d8"
          stroke="#fff"
          strokeWidth={2}
          style={{ cursor: 'pointer' }}
          onClick={() => setClickedDataPoint(payload)}
        />
      </g>
    );
  };

  // Loading state
  if (loading) return <p>Loading quizzes...</p>;

  return (
    <div className="quizzes">
      <h2>Quizzes</h2>
      
      {/* Alert Message Popup */}
      {alertMessage && (
        <div 
          className={`alert-popup ${alertMessage.type}`}
          style={{
            position: 'absolute',
            top: `${alertPosition.top}px`,
            left: `${alertPosition.left}px`,
            zIndex: 1000
          }}
        >
          {alertMessage.message}
        </div>
      )}

      {/* Create Quiz Section - Visible only to lecturers */}
      {user?.role === "lecturer" && (
        <div className="create-quiz">
          <h3>Create New Quiz</h3>

          <input
            className="quiz-input"
            type="text"
            placeholder="Quiz Title"
            value={newQuiz.title}
            onChange={(e) => handleQuizChange("title", e.target.value)}
          />

          <div>
            <label>
              Time Limit (minutes):{" "}
              <input
                className="quiz-input"
                type="number"
                min="0"
                value={newQuiz.timer}
                onChange={(e) =>
                  handleQuizChange("timer", parseInt(e.target.value))
                }
              />
            </label>
          </div>

          <div>
            <label>
              Attempts:
              <select
                className="quiz-select"
                value={newQuiz.attempts}
                onChange={(e) =>
                  handleQuizChange("attempts", parseInt(e.target.value))
                }
              >
                <option value={0}>Unlimited</option>
                {[...Array(10)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </label>
            <small className="note">Note: 0 = Unlimited</small>
          </div>

          <div>
            <label>
              Visible:
              <input
                type="checkbox"
                checked={newQuiz.is_visible || false}
                onChange={(e) => handleQuizChange("is_visible", e.target.checked)}
              />
            </label>
          </div>

          {/* Questions and Answers Input */}
          {newQuiz.questions.map((q, qIndex) => (
            <div key={qIndex} className="question">
              <input
                className="quiz-input"
                type="text"
                placeholder={`Question ${qIndex + 1}`}
                value={q.text}
                onChange={(e) => handleQuestionChange(qIndex, e.target.value)}
              />

              {q.answers.map((a, aIndex) => (
                <div key={aIndex} className="answer">
                  <input
                    className="quiz-input"
                    type="text"
                    placeholder={`Answer ${aIndex + 1}`}
                    value={a.text}
                    onChange={(e) =>
                      handleNewAnswerChange(qIndex, aIndex, "text", e.target.value)
                    }
                  />
                  <label>
                    <input
                      type="checkbox"
                      checked={a.is_correct}
                      onChange={(e) =>
                        handleNewAnswerChange(
                          qIndex,
                          aIndex,
                          "is_correct",
                          e.target.checked
                        )
                      }
                    />
                    Correct
                  </label>
                </div>
              ))}

              <button className="btn" onClick={() => addAnswer(qIndex)}>
                + Add Answer
              </button>
            </div>
          ))}

          <button className="btn" onClick={addQuestion}>
            + Add Question
          </button>

          <button className="btn" onClick={handleCreateQuiz} disabled={creating}>
            {creating ? "Creating..." : "Create Quiz"}
          </button>
        </div>
      )}

      {/* Quizzes List Section */}
      {quizzes.length === 0 ? (
        <p>No quizzes found.</p>
      ) : (
        quizzes.map((quiz) => (
          <div key={quiz.id} className="quiz-card">
            <div className="quiz-header" onClick={() => toggleExpand(quiz.id)}>
              <h3>{quiz.title}</h3>
              <p>
                Time Limit: {quiz.timer > 0 ? `${quiz.timer} minutes` : "No limit"}
              </p>
              <p>Attempts: {quiz.attempts === 0 ? "Unlimited" : quiz.attempts}</p>
            </div>

            {/* Expanded Quiz Editing View */}
            {expandedQuiz === quiz.id && (
              <div className="quiz-expanded">
                <label>
                  Title:{" "}
                  <input
                    className="quiz-input"
                    value={quiz.title}
                    onChange={(e) =>
                      setQuizzes(
                        quizzes.map((q) =>
                          q.id === quiz.id ? { ...q, title: e.target.value } : q
                        )
                      )
                    }
                  />
                </label>
                <label>
                  Time Limit (minutes):{" "}
                  <input
                    type="number"
                    min="0"
                    value={quiz.timer}
                    onChange={(e) =>
                      setQuizzes(
                        quizzes.map((q) =>
                          q.id === quiz.id
                            ? { ...q, timer: parseInt(e.target.value) }
                            : q
                        )
                      )
                    }
                  />
                </label>
                <label>
                  Attempts:{" "}
                  <select
                    value={quiz.attempts}
                    onChange={(e) =>
                      setQuizzes(
                        quizzes.map((q) =>
                          q.id === quiz.id
                            ? { ...q, attempts: parseInt(e.target.value) }
                            : q
                        )
                      )
                    }
                  >
                    <option value={0}>Unlimited</option>
                    {[...Array(10)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Visible:{" "}
                  <input
                    type="checkbox"
                    checked={quiz.is_visible}
                    onChange={(e) =>
                      setQuizzes(
                        quizzes.map((q) =>
                          q.id === quiz.id ? { ...q, is_visible: e.target.checked } : q
                        )
                      )
                    }
                  />
                </label>

                <h4>Questions</h4>
                {quiz.questions.map((q, qIndex) => (
                  <div key={q.id} className="question-update">
                    <input
                      className="quiz-input"
                      value={q.text}
                      onChange={(e) => {
                        const updatedQuestions = [...quiz.questions];
                        updatedQuestions[qIndex].text = e.target.value;
                        setQuizzes(
                          quizzes.map((qu) =>
                            qu.id === quiz.id ? { ...qu, questions: updatedQuestions } : qu
                          )
                        );
                      }}
                    />
                    {q.answers.map((a, aIndex) => (
                      <div key={a.id} className="answer-update">
                        <input
                          className="quiz-input"
                          value={a.text}
                          onChange={(e) => {
                            const updatedAnswers = [...q.answers];
                            updatedAnswers[aIndex].text = e.target.value;
                            const updatedQuestions = [...quiz.questions];
                            updatedQuestions[qIndex].answers = updatedAnswers;
                            setQuizzes(
                              quizzes.map((qu) =>
                                qu.id === quiz.id ? { ...qu, questions: updatedQuestions } : qu
                              )
                            );
                          }}
                        />
                        <label>
                          Correct:{" "}
                          <input
                            type="checkbox"
                            checked={a.is_correct}
                            onChange={(e) => {
                              const updatedAnswers = [...q.answers];
                              updatedAnswers[aIndex].is_correct = e.target.checked;
                              const updatedQuestions = [...quiz.questions];
                              updatedQuestions[qIndex].answers = updatedAnswers;
                              setQuizzes(
                                quizzes.map((qu) =>
                                  qu.id === quiz.id
                                    ? { ...qu, questions: updatedQuestions }
                                    : qu
                                )
                              );
                            }}
                          />
                        </label>
                        </div>
                    ))}
                  </div>
                ))}
                <button className="btn" onClick={(e) => handleQuizUpdate(quiz, e)}>
                  Update Quiz
                </button>
              </div>
            )}
          </div>
        ))
      )}

      {/* Performance Analytics Section */}
      {quizPerformance.length > 0 && (
        <div className="quiz-performance-section">
          <h3>Quiz Performance Overview</h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart
              data={quizPerformance}
              margin={{ top: 20, right: 30, left: 30, bottom: 60 }}
              onClick={(data) => {
                if (data && data.activePayload && data.activePayload.length) {
                  setClickedDataPoint(data.activePayload[0].payload);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="quizShort"
                height={60}
                interval={0}
              />
              <YAxis domain={[0, 100]} label={{ value: "Grade %", angle: -90, position: "insideLeft"}} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="avg"
                stroke="#8884d8"
                strokeWidth={2}
                dot={<CustomDot />}
                activeDot={<CustomActiveDot />}
              />
            </LineChart>
          </ResponsiveContainer>

          {/* Underperforming Students Details */}
          {clickedDataPoint && (
            <div className="underperforming-section">
              <h4>Underperforming Students in {clickedDataPoint.quiz}</h4>
              {clickedDataPoint.underperforming.length > 0 ? (
                <table className="student-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clickedDataPoint.underperforming.map((student, i) => (
                      <tr key={i}>
                        <td>
                          <button
                            className="student-name-link"
                            onClick={() =>
                              handleStudentClick(student.studentId, student.name, student.email)
                            }
                            title={`View ${student.name}'s performance`}
                          >
                            {student.name}
                          </button>
                        </td>
                        <td>
                          <a href={`mailto:${student.email}`} className="email-link">
                            {student.email}
                          </a>
                        </td>
                        <td>{student.grade}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No underperforming students in this quiz</p>
              )}
            </div>
          )}

          {/* Individual Student Performance Chart */}
          {selectedStudent && studentPerformance.length > 0 && (
            <div className="student-performance-section">
              <h4>{selectedStudent.name}'s Quiz Grades</h4>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={studentPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="quizShort" height={60} interval={0} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip content={<StudentPerformanceTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="grade" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}