import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
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
  const { currentCourse } = useCourse();
  const { user } = useUser();

  const [quizzes, setQuizzes] = useState([]);
  const [expandedQuiz, setExpandedQuiz] = useState(null);
  const [loading, setLoading] = useState(true);

  const [newQuiz, setNewQuiz] = useState({
    title: "",
    timer: 0,
    attempts: 0,
    questions: [{ text: "", answers: [{ text: "", is_correct: false }] }],
  });
  const [creating, setCreating] = useState(false);
  const [messages, setMessages] = useState({});

  // --- Graph states ---
  const [quizPerformance, setQuizPerformance] = useState([]);
  const [clickedDataPoint, setClickedDataPoint] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentPerformance, setStudentPerformance] = useState([]);
  const [enrolledStudents, setEnrolledStudents] = useState([]);

  // Fetch quizzes
  useEffect(() => {
    if (!currentCourse) return;
    setLoading(true);
    axios
      .get(`http://127.0.0.1:8000/quizzes/quizzes/?course=${currentCourse.id}`)
      .then((res) => setQuizzes(res.data))
      .catch((err) => console.error("Failed to fetch quizzes:", err))
      .finally(() => setLoading(false));
  }, [currentCourse]);

  // Fetch enrolled students
  useEffect(() => {
    if (!currentCourse) return;
    
    axios
      .get(`http://127.0.0.1:8000/enrollments/`)
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
          axios.get(`http://127.0.0.1:8000/`)
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

  // Fetch performances for graph
  useEffect(() => {
    if (!currentCourse || quizzes.length === 0 || enrolledStudents.length === 0) return;

    const fetchPerformanceData = async () => {
      const allPerformances = {};
      
      // Initialize performance data structure
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
            `http://127.0.0.1:8000/quizzes/attempts/user-performance/${student.id}/`
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

      // Aggregate data for the chart
      const aggregated = Object.values(allPerformances).map((q) => {
        const grades = q.scores.map((s) => s.grade);
        const avg =
          grades.length > 0
            ? Math.round(grades.reduce((a, b) => a + b, 0) / grades.length)
            : 0;
        const underperforming = q.scores.filter((s) => s.grade < 50);
        return {
          quiz: q.quiz,
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

  const toggleExpand = (quizId) => {
    setExpandedQuiz(expandedQuiz === quizId ? null : quizId);
    setMessages({});
  };

  // --- Quiz Creation ---
  const addQuestion = () => {
    setNewQuiz({
      ...newQuiz,
      questions: [
        ...newQuiz.questions,
        { text: "", answers: [{ text: "", is_correct: false }] },
      ],
    });
  };

  const addAnswer = (qIndex) => {
    const updated = [...newQuiz.questions];
    updated[qIndex].answers.push({ text: "", is_correct: false });
    setNewQuiz({ ...newQuiz, questions: updated });
  };

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

  const handleCreateQuiz = async () => {
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
        "http://127.0.0.1:8000/quizzes/quizzes/",
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
      setMessages({ ...messages, create: " Quiz created successfully!" });
    } catch (err) {
      console.error("Failed to create quiz:", err.response?.data || err.message);
      setMessages({ ...messages, create: " Failed to create quiz." });
    } finally {
      setCreating(false);
    }
  };

  // --- Quiz Update ---
  const handleQuizUpdate = async (quiz) => {
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
        `http://127.0.0.1:8000/quizzes/quizzes/${quiz.id}/`,
        payload
      );
      setQuizzes(quizzes.map((q) => (q.id === quiz.id ? res.data : q)));
      setMessages({ ...messages, update: "Quiz updated successfully!" });
    } catch (err) {
      console.error("Failed to update quiz:", err.response?.data || err.message);
      setMessages({ ...messages, update: "Failed to update quiz." });
    }
  };

  const handleStudentClick = useCallback(
    async (studentId, studentName, studentEmail) => {
      setSelectedStudent({ 
        id: studentId, 
        name: studentName, 
        email: studentEmail 
      });

      try {
        const perfRes = await axios.get(
          `http://127.0.0.1:8000/quizzes/attempts/user-performance/${studentId}/`
        );
        
        // Sort quizzes in the order they appear in the main graph
        const sortedData = perfRes.data
          .map((p) => ({
            quiz: p.quiz_title,
            grade: p.percentage,
          }))
          .sort((a, b) => {
            // Get the index of each quiz in the main performance data
            const aIndex = quizPerformance.findIndex(q => q.quiz === a.quiz);
            const bIndex = quizPerformance.findIndex(q => q.quiz === b.quiz);
            return aIndex - bIndex; // Sort in the same order as main graph
          });
          
        setStudentPerformance(sortedData);
      } catch (err) {
        console.error("Failed to fetch student performance:", err);
      }
    },
    [quizPerformance]
  );

  const CustomTooltip = ({ active, payload }) => {
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

  // Custom dot component for better click handling
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

  // Custom active dot component for better click handling
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

  if (loading) return <p>Loading quizzes...</p>;
  if (!loading && quizzes.length === 0) return <p>No quizzes found.</p>;

  return (
    <div className="quizzes">
      <h2>Quizzes</h2>
      {messages.create && <p className="message">{messages.create}</p>}
      {messages.update && <p className="message">{messages.update}</p>}

      {/* Create Quiz Section */}
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

          {messages.create && <p className="message">{messages.create}</p>}
        </div>
      )}

      {/* Quizzes Section */}
      {quizzes.map((quiz) => (
        <div key={quiz.id} className="quiz-card">
          <div className="quiz-header" onClick={() => toggleExpand(quiz.id)}>
            <h3>{quiz.title}</h3>
            <p>
              Time Limit: {quiz.timer > 0 ? `${quiz.timer} minutes` : "No limit"}
            </p>
            <p>Attempts: {quiz.attempts === 0 ? "Unlimited" : quiz.attempts}</p>
          </div>

          {expandedQuiz === quiz.id && (
            <div className="quiz-expanded">
              <label>
                Title:{" "}
                <input
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
              <button className="btn" onClick={() => handleQuizUpdate(quiz)}>
                Update Quiz
              </button>
            </div>
          )}
        </div>
      ))}

      {/* Performance Graph */}
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
                dataKey="quiz"
                angle={-45}
                textAnchor="end"
                height={80}
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

          {selectedStudent && studentPerformance.length > 0 && (
            <div className="student-performance-section">
              <h4>{selectedStudent.name}'s Quiz Grades</h4>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={studentPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="quiz" angle={-45} textAnchor="end" height={80} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
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