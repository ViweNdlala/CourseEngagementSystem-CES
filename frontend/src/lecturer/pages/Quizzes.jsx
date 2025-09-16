import React, { useEffect, useState } from "react";
import axios from "axios";
import { useCourse } from "../../contexts/CourseContext";
import { useUser } from "../../contexts/UserContext";

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
    questions: [{ text: "", answers: [{ text: "", is_correct: false }] }],
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!currentCourse) return;
    setLoading(true);
    axios
      .get(`http://127.0.0.1:8000/quizzes/quizzes/?course=${currentCourse.id}`)
      // .get(`http://127.0.0.1:8000/quizzes/quizzes/?course=${currentCourse.id}`)
      .then(res => setQuizzes(res.data))
      .catch(err => console.error("Failed to fetch quizzes:", err))
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

  // Lecturer functions
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
      course: currentCourse?.id,  // must be valid
      timer: newQuiz.timer !== undefined ? Number(newQuiz.timer) : 0,
      is_visible: newQuiz.is_visible ?? false,
      questions: validQuestions,   // filter out empty questions/answers
    };


    const res = await axios.post("http://127.0.0.1:8000/quizzes/quizzes/", payload);
    setQuizzes([...quizzes, res.data]);
    setNewQuiz({ title: "", timer: 0, is_visible: false, questions: [] });
  } catch (err) {
    console.error("Failed to create quiz:", err.response?.data || err.message);
  }
};


  const toggleVisibility = (quiz) => {
    axios
      .patch(`http://127.0.0.1:8000/quizzes/quizzes/${quiz.id}/`, { is_visible: !quiz.is_visible })
      .then(res => setQuizzes(quizzes.map(q => q.id === quiz.id ? res.data : q)))
      .catch(err => console.error("Failed to toggle visibility:", err));
  };

  const updateTimer = (quiz, newTimer) => {
    axios
      .patch(`http://127.0.0.1:8000/quizzes/quizzes/${quiz.id}/`, { timer: newTimer })
      .then(res => setQuizzes(quizzes.map(q => q.id === quiz.id ? res.data : q)))
      .catch(err => console.error("Failed to update timer:", err));
  };

  const updateCorrectAnswer = (questionId, answerId) => {
    axios
      .patch(`http://127.0.0.1:8000/quizzes/quizzes/${questionId}/`, { questions: [{ id: questionId, correct_answer: answerId }] })
      .then(() => {
        setQuizzes(prev =>
          prev.map(quiz => ({
            ...quiz,
            questions: quiz.questions.map(q =>
              q.id === questionId ? { ...q, answers: q.answers.map(a => ({ ...a, is_correct: a.id === answerId })) } : q
            ),
          }))
        );
      })
      .catch(err => console.error("Failed to update correct answer:", err));
  };

  if (loading) return <p>Loading quizzes...</p>;
  if (!loading && quizzes.length === 0) return <p>No quizzes found.</p>;

  return (
    <div className="quizzes">
      <h2>Quizzes</h2>

      {user?.role === "lecturer" && (
        <div style={{ border: "1px solid gray", padding: "10px", marginBottom: "20px" }}>
          <h3>Create New Quiz</h3>
          <input type="text" placeholder="Quiz Title" value={newQuiz.title} onChange={e => handleQuizChange("title", e.target.value)} />
          <div>
            <label>Time Limit (minutes): <input type="number" min="0" value={newQuiz.timer} onChange={e => handleQuizChange("timer", parseInt(e.target.value))} /></label>
          </div>

          {newQuiz.questions.map((q, qIndex) => (
            <div key={qIndex}>
              <input type="text" placeholder={`Question ${qIndex + 1}`} value={q.text} onChange={e => handleQuestionChange(qIndex, e.target.value)} />
              {q.answers.map((a, aIndex) => (
                <div key={aIndex}>
                  <input type="text" placeholder={`Answer ${aIndex + 1}`} value={a.text} onChange={e => handleNewAnswerChange(qIndex, aIndex, "text", e.target.value)} />
                  <label>
                    <input type="checkbox" checked={a.is_correct} onChange={e => handleNewAnswerChange(qIndex, aIndex, "is_correct", e.target.checked)} />
                    Correct
                  </label>
                </div>
              ))}
              <button onClick={() => addAnswer(qIndex)}>+ Add Answer</button>
            </div>
          ))}
          <button onClick={addQuestion}>+ Add Question</button>
          <button onClick={handleCreateQuiz} disabled={creating}>{creating ? "Creating..." : "Create Quiz"}</button>
        </div>
      )}

      {quizzes.map(quiz => (
        <div key={quiz.id} style={{ border: "1px solid black", marginBottom: "15px", padding: "10px" }}>
          <div style={{ cursor: "pointer", padding: "10px" }} onClick={() => toggleExpand(quiz.id)}>
            <h3>{quiz.title}</h3>
            <p>Time Limit: {quiz.timer > 0 ? `${quiz.timer} minutes` : "No limit"}</p>
            {user?.role === "lecturer" && (
              <div>
                <label>Visible to students: <input type="checkbox" checked={quiz.is_visible} onChange={() => toggleVisibility(quiz)} /></label>
                <label>Update Timer: <input type="number" min="0" defaultValue={quiz.timer} onBlur={e => updateTimer(quiz, parseInt(e.target.value))} /></label>
              </div>
            )}
          </div>

          {expandedQuiz === quiz.id && quiz.questions.map((q, idx) => (
            <div key={q.id}>
              <p><strong>Question {idx + 1}:</strong> {q.text}</p>
              <ul>
                {q.answers.map(a => {
                  const isCorrect = a.is_correct;
                  const isSelected = answers[q.id] === a.id;
                  return (
                    <li key={a.id}>
                      <label>
                        <input type="radio" checked={isSelected} disabled={user?.role === "lecturer"} onChange={() => handleAnswerChange(q.id, a.id)} />
                        {a.text} {submitted[quiz.id] && (isCorrect ? "✔" : isSelected && !isCorrect ? "✖" : "")}
                      </label>
                      {user?.role === "lecturer" && <button onClick={() => updateCorrectAnswer(q.id, a.id)}>Mark Correct</button>}
                    </li>
                  );
                })}
              </ul>
              {user?.role !== "lecturer" && <button onClick={() => handleSubmit(quiz.id, quiz.questions)} disabled={submitted[quiz.id]}>Submit</button>}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
