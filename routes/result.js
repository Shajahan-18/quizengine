const express = require("express");
const PDFDocument = require("pdfkit");
const pool = require("../db");

const router = express.Router();

/* ---------------- GET RESULT ---------------- */

router.get("/:attemptId", async (req, res) => {
  try {
    const attemptId = Number(req.params.attemptId);

    const [rows] = await pool.query(
      `SELECT a.id, a.score, a.total, a.percentage, a.passed, a.created_at,
              q.title AS quiz_title, q.pass_score
       FROM attempts a
       JOIN quizzes q ON q.id = a.quiz_id
       WHERE a.id = ?`,
      [attemptId]
    );

    if (rows.length === 0)
      return res.status(404).json({ error: "Result not found" });

    res.json({ attempt: rows[0] });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
});


/* ---------------- VINTAGE CERTIFICATE ---------------- */

router.get("/:attemptId/certificate", async (req, res) => {
  try {
    const attemptId = Number(req.params.attemptId);
    const name = (req.query.name || "Student").toString().slice(0, 60);

    const [rows] = await pool.query(
      `SELECT a.percentage, a.passed, a.created_at,
              q.title AS quiz_title
       FROM attempts a
       JOIN quizzes q ON q.id = a.quiz_id
       WHERE a.id = ?`,
      [attemptId]
    );

    if (rows.length === 0)
      return res.status(404).json({ error: "Not found" });

    if (!rows[0].passed)
      return res.status(403).json({ error: "Not passed" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="certificate_${attemptId}.pdf"`
    );

    const doc = new PDFDocument({ size: "A4", margin: 0 });
    doc.pipe(res);

    const width = doc.page.width;
    const height = doc.page.height;

    /* ---------- CREAM BACKGROUND ---------- */
    doc.rect(0, 0, width, height)
       .fill("#f5e6c8");

    /* ---------- OUTER GOLD BORDER ---------- */
    doc.lineWidth(8)
       .strokeColor("#c6a75e")
       .rect(40, 40, width - 80, height - 80)
       .stroke();

    /* ---------- INNER GOLD BORDER ---------- */
    doc.lineWidth(2)
       .strokeColor("#b8903c")
       .rect(60, 60, width - 120, height - 120)
       .stroke();

    /* ---------- CORNER LINES ---------- */
    doc.lineWidth(2).strokeColor("#b8903c");

    doc.moveTo(60, 100).lineTo(60, 60).lineTo(100, 60).stroke();
    doc.moveTo(width - 60, 100).lineTo(width - 60, 60).lineTo(width - 100, 60).stroke();
    doc.moveTo(60, height - 100).lineTo(60, height - 60).lineTo(100, height - 60).stroke();
    doc.moveTo(width - 60, height - 100).lineTo(width - 60, height - 60).lineTo(width - 100, height - 60).stroke();

    /* =====================================================
       ELEGANT TYPOGRAPHY SECTION (UPDATED)
       ===================================================== */

    doc.moveDown(5);

    /* TITLE */
    doc.font("Times-Bold")
       .fontSize(44)
       .fillColor("#b8903c")
       .text("CERTIFICATE", { align: "center" });

    doc.moveDown(0.3);

    doc.font("Times-Roman")
       .fontSize(20)
       .fillColor("#8b5e1a")
       .text("of Achievement", { align: "center" });

    doc.moveDown(2);

    /* SUBTITLE */
    doc.font("Times-Italic")
       .fontSize(18)
       .fillColor("#6b4f1d")
       .text("This certificate is proudly presented to", {
         align: "center"
       });

    doc.moveDown(1.5);

    /* NAME (MAIN FOCUS) */
    doc.font("Times-Bold")
       .fontSize(32)
       .fillColor("#8b5e1a")
       .text(name, {
         align: "center"
       });

    doc.moveDown(2);

    /* QUIZ TEXT */
    doc.font("Times-Roman")
       .fontSize(18)
       .fillColor("#6b4f1d")
       .text("For successfully completing the quiz", {
         align: "center"
       });

    doc.moveDown(1);

    doc.font("Times-Bold")
       .fontSize(22)
       .fillColor("#8b5e1a")
       .text(rows[0].quiz_title, {
         align: "center"
       });

    doc.moveDown(1.5);

    /* SCORE */
    doc.font("Times-Roman")
       .fontSize(18)
       .fillColor("#6b4f1d")
       .text(`Score Achieved: ${rows[0].percentage}%`, {
         align: "center"
       });

    /* DATE */
    doc.moveDown(4);

    const issueDate = new Date(rows[0].created_at).toLocaleDateString();

    doc.font("Times-Roman")
       .fontSize(14)
       .fillColor("#6b4f1d")
       .text(`Issued on: ${issueDate}`, {
         align: "center"
       });

    doc.end();

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;