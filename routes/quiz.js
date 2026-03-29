const express = require("express");
const pool = require("../db");

const router = express.Router();

/* ================= GET QUIZ LIST ================= */
router.get("/list", async (req, res) => {
  try {

    if (!req.session.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = req.session.user.id;

    const [quizzes] = await pool.query(
      "SELECT id, title, pass_score FROM quizzes ORDER BY id"
    );

    // Get quizzes already passed by user
    const [passedRows] = await pool.query(
      "SELECT quiz_id FROM attempts WHERE user_id=? AND passed=1",
      [userId]
    );

    const passedQuizIds = passedRows.map(r => r.quiz_id);

    const updatedQuizzes = quizzes.map(q => ({
      ...q,
      completed: passedQuizIds.includes(q.id)
    }));

    res.json({ quizzes: updatedQuizzes });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
});
/* ================= GET SINGLE QUIZ ================= */
router.get("/:quizId", async (req, res) => {
  try {
    const quizId = Number(req.params.quizId);

    // 🔐 Must be logged in
    if (!req.session.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = req.session.user.id;

    // 🚫 Check if already passed
    const [attemptCheck] = await pool.query(
      "SELECT id FROM attempts WHERE user_id=? AND quiz_id=? AND passed=1 LIMIT 1",
      [userId, quizId]
    );

    if (attemptCheck.length > 0) {
      return res.status(403).json({
        error: "You have already completed this course and received certificate."
      });
    }

    const [quizRows] = await pool.query(
      "SELECT id, title, pass_score FROM quizzes WHERE id=?",
      [quizId]
    );

    if (quizRows.length === 0)
      return res.status(404).json({ error: "Quiz not found" });

    const [questionRows] = await pool.query(
      "SELECT id, question_text FROM questions WHERE quiz_id=? ORDER BY id",
      [quizId]
    );

    if (questionRows.length === 0)
      return res.json({ quiz: quizRows[0], questions: [] });

    const questionIds = questionRows.map((q) => q.id);

    const [optionRows] = await pool.query(
      `SELECT id, question_id, option_text
       FROM options
       WHERE question_id IN (${questionIds.map(() => "?").join(",")})
       ORDER BY question_id, id`,
      questionIds
    );

    const optionsByQ = {};
    for (const opt of optionRows) {
      if (!optionsByQ[opt.question_id]) optionsByQ[opt.question_id] = [];
      optionsByQ[opt.question_id].push({
        id: opt.id,
        text: opt.option_text,
      });
    }

    const questions = questionRows.map((q) => ({
      id: q.id,
      text: q.question_text,
      options: optionsByQ[q.id] || [],
    }));

    res.json({ quiz: quizRows[0], questions });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= SUBMIT QUIZ ================= */
router.post("/:quizId/submit", async (req, res) => {
  try {
    const quizId = Number(req.params.quizId);
    const answers = req.body.answers;

    // 🔐 Must be logged in
    if (!req.session.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = req.session.user.id;

    if (!answers || typeof answers !== "object") {
      return res.status(400).json({ error: "Invalid answers" });
    }

    // 🚫 Prevent reattempt if already passed
    const [attemptCheck] = await pool.query(
      "SELECT id FROM attempts WHERE user_id=? AND quiz_id=? AND passed=1 LIMIT 1",
      [userId, quizId]
    );

    if (attemptCheck.length > 0) {
      return res.status(403).json({
        error: "You already passed this course. Retake not allowed."
      });
    }

    const [quizRows] = await pool.query(
      "SELECT id, pass_score FROM quizzes WHERE id=?",
      [quizId]
    );

    if (quizRows.length === 0)
      return res.status(404).json({ error: "Quiz not found" });

    const [questionRows] = await pool.query(
      "SELECT id FROM questions WHERE quiz_id=?",
      [quizId]
    );

    const questionIds = questionRows.map((q) => q.id);
    const total = questionIds.length;

    if (total === 0)
      return res.status(400).json({ error: "No questions found" });

    const [correctRows] = await pool.query(
      `SELECT id AS option_id, question_id
       FROM options
       WHERE question_id IN (${questionIds.map(() => "?").join(",")})
       AND is_correct = 1`,
      questionIds
    );

    const correctByQ = {};
    for (const row of correctRows) {
      correctByQ[row.question_id] = row.option_id;
    }

    let score = 0;

    for (const qId of questionIds) {
      const selected = Number(answers[String(qId)] || 0);
      const correct = Number(correctByQ[qId] || 0);
      if (selected !== 0 && selected === correct) score++;
    }

    const percentage = Number(((score / total) * 100).toFixed(2));
    const passed = percentage >= quizRows[0].pass_score ? 1 : 0;

    // ✅ Store attempt
    const [attemptResult] = await pool.query(
      "INSERT INTO attempts (user_id, quiz_id, score, total, percentage, passed) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, quizId, score, total, percentage, passed]
    );

    res.json({
      ok: true,
      attemptId: attemptResult.insertId,
      score,
      total,
      percentage,
      passed: !!passed,
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;