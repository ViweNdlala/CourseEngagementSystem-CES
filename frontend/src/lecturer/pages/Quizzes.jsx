


import React, { useEffect, useState } from "react";
import axios from "axios";
import { useCourse } from "../../contexts/CourseContext";
import { useUser } from "../../contexts/UserContext";
import "../styles/Quizzes.css";

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

  useEffect(() => {
    if (!currentCourse) return;
    setLoading(true);
    axios
      .get(`http://127.0.0.1:8000/quizzes/quizzes/?course=${currentCourse.id}`)
      .then(res => setQuizzes(res.data))
      .catch(err => console.error("Failed to fetch quizzes:", err))
      .finally(() => setLoading(false));
  }, [currentCourse]);

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

  const addQuestion = () => {
    setNewQuiz({
      ...newQuiz,
      questions: [...newQuiz.questions, { text: "", answers: [{ text: "", is_correct: false }] }],
    });
  };

  const addAnswer = (qIndex) => {
    const updated = [...newQuiz.questions];
    updated[qIndex].answers.push({ text: "", is_correct: false });
    setNewQuiz({ ...newQuiz, questions: updated });
  };

  const handleQuizChange = (field, value) => setNewQuiz({ ...newQuiz, [field]: value });
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
        .filter(q => q.text.trim() !== "")
        .map(q => ({
          text: q.text,
          answers: q.answers
            .filter(a => a.text.trim() !== "")
            .map(a => ({
              text: a.text,
              is_correct: a.is_correct || false
            }))
        }));

      const payload = {
        title: newQuiz.title || "",
        course: currentCourse?.id || null,
        timer: newQuiz.timer !== undefined ? Number(newQuiz.timer) : 0,
        attempts: newQuiz.attempts,
        is_visible: newQuiz.is_visible ?? false,
        questions: validQuestions
      };

      const res = await axios.post("http://127.0.0.1:8000/quizzes/quizzes/", payload);
      setQuizzes([...quizzes, res.data]);
      setNewQuiz({ title: "", timer: 0, attempts: 0, is_visible: false, questions: [] });
      setMessages({ ...messages, create: " Quiz created successfully!" });
    } catch (err) {
      console.error("Failed to create quiz:", err.response?.data || err.message);
      setMessages({ ...messages, create: " Failed to create quiz." });
    } finally {
      setCreating(false);
    }
  };

  const handleSaveQuizChanges = async (quiz) => {
    try {
      const payload = {
        title: quiz.title,
        timer: quiz.timer,
        attempts: quiz.attempts ?? 0,
        is_visible: quiz.is_visible,
        questions: quiz.questions.map(q => ({
          id: q.id,
          text: q.text,
          answers: q.answers.map(a => ({
            id: a.id,
            text: a.text,
            is_correct: a.is_correct
          }))
        }))
      };
      const res = await axios.patch(`http://127.0.0.1:8000/quizzes/quizzes/${quiz.id}/`, payload);
      setQuizzes(quizzes.map(q => q.id === quiz.id ? res.data : q));
      setMessages({ ...messages, [quiz.id]: "Changes saved!" });
    } catch (err) {
      console.error("Failed to save changes:", err);
      setMessages({ ...messages, [quiz.id]: "Failed to save changes." });
    }
  };

  const toggleVisibility = (quiz) => {
    const updatedQuiz = { ...quiz, is_visible: !quiz.is_visible };
    setQuizzes(quizzes.map(q => q.id === quiz.id ? updatedQuiz : q));
  };

  const updateTimer = (quiz, newTimer) => {
    const updatedQuiz = { ...quiz, timer: newTimer };
    setQuizzes(quizzes.map(q => q.id === quiz.id ? updatedQuiz : q));
  };

  const updateAttempts = (quiz, newAttempts) => {
    const updatedQuiz = { ...quiz, attempts: newAttempts };
    setQuizzes(prev => prev.map(q => q.id === quiz.id ? updatedQuiz : q));
  };

  const toggleCorrectAnswer = (quizId, questionId, answerId, checked) => {
    setQuizzes(prev =>
      prev.map(quiz =>
        quiz.id === quizId
          ? {
              ...quiz,
              questions: quiz.questions.map(q =>
                q.id === questionId
                  ? {
                      ...q,
                      answers: q.answers.map(a =>
                        a.id === answerId ? { ...a, is_correct: checked } : a
                      )
                    }
                  : q
              )
            }
          : quiz
      )
    );
  };

  if (loading) return <p>Loading quizzes...</p>;
  if (!loading && quizzes.length === 0) return <p>No quizzes found.</p>;

  return (
    <div className="quizzes">
      <h2>Quizzes</h2>

      {messages.create && <p className="message">{messages.create}</p>}

      {user?.role === "lecturer" && (
        <div className="create-quiz">
          <h3>Create New Quiz</h3>
          <input className="quiz-input" type="text" placeholder="Quiz Title" value={newQuiz.title} onChange={e => handleQuizChange("title", e.target.value)} />
          <div>
            <label>Time Limit (minutes): <input className="quiz-input" type="number" min="0" value={newQuiz.timer} onChange={e => handleQuizChange("timer", parseInt(e.target.value))} /></label>
          </div>
          <div>
            <label>
              Attempts:
              <select className="quiz-select" value={newQuiz.attempts} onChange={e => handleQuizChange("attempts", parseInt(e.target.value))}>
                <option value={0}>Unlimited</option>
                {[...Array(10)].map((_, i) => (
                  <option key={i+1} value={i+1}>{i+1}</option>
                ))}
              </select>
            </label>
            <small className="note">Note: 0 = Unlimited</small>
          </div>

          {newQuiz.questions.map((q, qIndex) => (
            <div key={qIndex} className="question">
              <input className="quiz-input" type="text" placeholder={`Question ${qIndex + 1}`} value={q.text} onChange={e => handleQuestionChange(qIndex, e.target.value)} />
              {q.answers.map((a, aIndex) => (
                <div key={aIndex} className="answer">
                  <input className="quiz-input" type="text" placeholder={`Answer ${aIndex + 1}`} value={a.text} onChange={e => handleNewAnswerChange(qIndex, aIndex, "text", e.target.value)} />
                  <label>
                    <input type="checkbox" checked={a.is_correct} onChange={e => handleNewAnswerChange(qIndex, aIndex, "is_correct", e.target.checked)} />
                    Correct
                  </label>
                </div>
              ))}
              <button className="btn" onClick={() => addAnswer(qIndex)}>+ Add Answer</button>
            </div>
          ))}

          <button className="btn" onClick={addQuestion}>+ Add Question</button>
          <button className="btn" onClick={handleCreateQuiz} disabled={creating}>{creating ? "Creating..." : "Create Quiz"}</button>
        </div>
      )}

      {quizzes.map(quiz => (
        <div key={quiz.id} className="quiz-card">
          <div className="quiz-header" onClick={() => toggleExpand(quiz.id)}>
            <h3>{quiz.title}</h3>
            <p>Time Limit: {quiz.timer > 0 ? `${quiz.timer} minutes` : "No limit"}</p>
            <p>Attempts: {quiz.attempts === 0 ? "Unlimited" : quiz.attempts}</p>
            {user?.role === "lecturer" && (
              <div className="quiz-settings">
                <label>Visible: <input type="checkbox" checked={quiz.is_visible} onChange={() => toggleVisibility(quiz)} /></label>
                <label>Update Timer: <input className="quiz-input" type="number" min="0" defaultValue={quiz.timer} onBlur={e => updateTimer(quiz, parseInt(e.target.value))} /></label>
                <label>
                  Attempts:
                  <select className="quiz-select" value={quiz.attempts ?? 0} onChange={e => updateAttempts(quiz, parseInt(e.target.value))}>
                    <option value={0}>Unlimited</option>
                    {[...Array(10)].map((_, i) => (
                      <option key={i+1} value={i+1}>{i+1}</option>
                    ))}
                  </select>
                </label>
                <small className="note">Change attempts then click "Save Changes"</small>
              </div>
            )}
          </div>

          {expandedQuiz === quiz.id && quiz.questions.map((q, idx) => (
            <div key={q.id} className="quiz-question">
              <p><strong>Question {idx + 1}:</strong> {q.text}</p>
              <ul>
                {q.answers.map(a => (
                  <li key={a.id}>
                    <label>
                      {user?.role === "lecturer" ? (
                        <input type="checkbox" checked={!!a.is_correct} onChange={e => toggleCorrectAnswer(quiz.id, q.id, a.id, e.target.checked)} />
                      ) : (
                        <input type="radio" name={`q-${q.id}`} checked={answers[q.id] === a.id} onChange={() => handleAnswerChange(q.id, a.id)} />
                      )}
                      {a.text}
                    </label>
                  </li>
                ))}
              </ul>
              {user?.role !== "lecturer" && <button className="btn" onClick={() => handleSubmit(quiz.id, quiz.questions)} disabled={submitted[quiz.id]}>Submit</button>}
            </div>
          ))}

          {user?.role === "lecturer" && (
            <button className="btn save-btn" onClick={() => handleSaveQuizChanges(quiz)}>Save Changes</button>
          )}

          {messages[quiz.id] && <p className="message">{messages[quiz.id]}</p>}
        </div>
      ))}
    </div>
  );
}
