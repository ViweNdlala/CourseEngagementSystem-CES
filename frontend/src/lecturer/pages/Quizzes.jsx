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
  const [answers, setAnswers] = useState({});
  const [grades, setGrades] = useState({});
  const [submitted, setSubmitted] = useState({});
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

  // Fetch enrollments + performances AFTER quizzes loaded
  useEffect(() => {
    if (!currentCourse || quizzes.length === 0) return;

    axios
      .get(`http://127.0.0.1:8000/enrollments/?course=${currentCourse.id}`)
      .then(async (res) => {
        const enrollments = res.data || [];
        // ✅ filter only students belonging to this course
        const students = enrollments
          .filter((en) => en.course === currentCourse.id)
          .map((en) => ({
            student: en.student,
            name: en.student_name || en.email || "Unknown",
            email: en.email,
          }));

        if (students.length === 0) return;

        const allPerformances = {};
        for (const quiz of quizzes) {
          allPerformances[quiz.id] = {
            quiz: quiz.title,
            scores: students.map((s) => ({
              student: s.student,
              name: s.name,
              email: s.email,
              grade: 0,
            })),
          };
        }

        // fill in actual performances
        for (const s of students) {
          try {
            const perfRes = await axios.get(
              `http://127.0.0.1:8000/quizzes/attempts/user-performance/${s.student}/`
            );
            perfRes.data.forEach((p) => {
              const quizEntry = Object.values(allPerformances).find(
                (q) => q.quiz === p.quiz_title
              );
              if (quizEntry) {
                const idx = quizEntry.scores.findIndex(
                  (sc) => sc.student === s.student
                );
                if (idx !== -1) {
                  quizEntry.scores[idx].grade = p.percentage;
                }
              }
            });
          } catch (err) {
            console.error("Error fetching performance for student:", s, err);
          }
        }

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
              grades: [{ quiz: q.quiz, grade: s.grade }],
              studentId: s.student,
            })),
          };
        });

        setQuizPerformance(aggregated);
      })
      .catch((err) => console.error("Failed to fetch enrollments:", err));
  }, [currentCourse, quizzes]);

  const toggleExpand = (quizId) => {
    setExpandedQuiz(expandedQuiz === quizId ? null : quizId);
    setGrades({});
    setSubmitted({});
    setMessages({});
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
      if (chosenAnswer?.id === correctAnswer?.id) correctCount++;
    });

    const grade = {
      total: questions.length,
      correct: correctCount,
      percentage: Math.round((correctCount / questions.length) * 100),
    };
    setGrades({ ...grades, [quizId]: grade });
    setSubmitted({ ...submitted, [quizId]: true });
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
        questions: [],
      });
      setMessages({ ...messages, create: " Quiz created successfully!" });
    } catch (err) {
      console.error("Failed to create quiz:", err.response?.data || err.message);
      setMessages({ ...messages, create: " Failed to create quiz." });
    } finally {
      setCreating(false);
    }
  };

  const handleStudentClick = useCallback(
    async (studentEmail, studentId) => {
      if (!clickedDataPoint) return;
      setSelectedStudent({ email: studentEmail });

      try {
        const perfRes = await axios.get(
          `http://127.0.0.1:8000/quizzes/attempts/user-performance/${studentId}/`
        );
        const data = perfRes.data.map((p) => ({
          quiz: p.quiz_title,
          grade: p.percentage,
        }));
        setStudentPerformance(data);
      } catch (err) {
        console.error("Failed to fetch student performance:", err);
      }
    },
    [clickedDataPoint]
  );

  // Tooltip just shows info
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="custom-tooltip">
          <h4>{data.quiz}</h4>
          <p>Average Grade: {data.avg}%</p>
          <p>Underperforming: {data.underperforming?.length || 0}</p>
          <p>Click a point for details</p>
        </div>
      );
    }
    return null;
  };

  if (loading) return <p>Loading quizzes...</p>;
  if (!loading && quizzes.length === 0) return <p>No quizzes found.</p>;

  return (
    <div className="quizzes">
      <h2>Quizzes</h2>
      {messages.create && <p className="message">{messages.create}</p>}

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
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="quiz" />
              <YAxis domain={[0, 100]} label={{ value: "Grade %", angle: -90 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="avg"
                stroke="#8884d8"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{
                  r: 6,
                  onClick: (e) => setClickedDataPoint(e.payload),
                }}
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
                    </tr>
                  </thead>
                  <tbody>
                    {clickedDataPoint.underperforming.map((student, i) => (
                      <tr key={i}>
                        <td>
                          <span
                            className="student-name"
                            onClick={() =>
                              handleStudentClick(student.email, student.studentId)
                            }
                          >
                            {student.name}
                          </span>
                        </td>
                        <td>
                          <a href={`mailto:${student.email}`}>{student.email}</a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>None</p>
              )}
            </div>
          )}

          {selectedStudent && studentPerformance.length > 0 && (
            <div className="student-performance-section">
              <h4>{selectedStudent.email}'s Quiz Grades</h4>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={studentPerformance}>
                  <XAxis dataKey="quiz" />
                  <YAxis domain={[0, 100]} label={{ value: "Grade %", angle: -90 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="grade"
                    stroke="#8884d8"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
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
