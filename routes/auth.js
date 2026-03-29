const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const pool = require("../db");

const router = express.Router();

/* Show Login Page */
router.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../views", "login.html"));
});

/* API to get login error */
router.get("/login-error", (req, res) => {
  const error = req.session.error || "";
  req.session.error = null;
  res.json({ error });
});

/* Show Register Page */
router.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "../views", "register.html"));
});

/* REGISTER USER */
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
      [name, email, hashedPassword]
    );

    res.redirect("/");

  } catch (err) {
    console.log(err);

    if (err.code === "ER_DUP_ENTRY") {
      req.session.error = "Email already registered";
      return res.redirect("/register");
    }

    req.session.error = "Registration failed";
    res.redirect("/register");
  }
});

/* LOGIN USER */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      req.session.error = "User not found";
      return res.redirect("/");
    }

    const user = rows[0];

    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      req.session.error = "Invalid password";
      return res.redirect("/");
    }

    req.session.user = user;
    res.redirect("/select");

  } catch (err) {
    console.log(err);
    req.session.error = "Login failed";
    res.redirect("/");
  }
});

/* LOGOUT */
router.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

module.exports = router;