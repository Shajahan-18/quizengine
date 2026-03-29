require("dotenv").config();
const path = require("path");
const express = require("express");
const session = require("express-session");

const quizRoutes = require("./routes/quiz");
const resultRoutes = require("./routes/result");
const authRoutes = require("./routes/auth");

const app = express();

/* ================= MIDDLEWARE ================= */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use("/public", express.static(path.join(__dirname, "public")));

// Session setup
app.use(session({
  secret: "quiz_engine_secret_key",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // true only if using https
}));

/* ================= AUTH ROUTES ================= */

// Handles:
// GET /
// GET /register
// POST /register
// POST /login
// GET /logout
app.use("/", authRoutes);

/* ================= LOGIN PROTECTION ================= */

function isLoggedIn(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/");
  }
  next();
}

/* ================= PROTECTED PAGES ================= */

// Select Quiz Page
app.get("/select", isLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, "views", "select-quiz.html"));
});

// Quiz Page
app.get("/quiz", isLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, "views", "quiz.html"));
});

// Result Page
app.get("/result", isLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, "views", "result.html"));
});

/* ================= API ROUTES (DO NOT TOUCH) ================= */

app.use("/api/quiz", quizRoutes);
app.use("/api/result", resultRoutes);

/* ================= START SERVER ================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});