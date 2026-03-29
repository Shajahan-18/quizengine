async function api(url, method = "GET", body) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function qs(id) {
  return document.getElementById(id);
}

function getParam(name) {
  const u = new URL(window.location.href);
  return u.searchParams.get(name);
}

/* ================= SELECT PAGE ================= */
async function selectPage() {
  const msg = qs("msg");

  try {
    const data = await api("/api/quiz/list");
    const container = qs("quizList");
    container.innerHTML = "";

    data.quizzes.forEach((q) => {
      const div = document.createElement("div");
      div.className = "card";

      div.innerHTML = `
        <h2>${q.title}</h2>
        <p>Pass Score: ${q.pass_score}%</p>
      `;

      // Add completed badge
      if (q.completed) {
        div.innerHTML += `<span class="badge completed">COMPLETED</span>`;
      }

      const btn = document.createElement("button");

      if (q.completed) {
        btn.textContent = "Completed ✅";
        btn.disabled = true;
      } else {
        btn.textContent = "Start Quiz";
        btn.onclick = () => {
          window.location.href = `/quiz?quizId=${q.id}`;
        };
      }

      div.appendChild(btn);
      container.appendChild(div);
    });

  } catch (e) {
    msg.textContent = e.message;
    msg.classList.add("error");
  }
}

/* ================= QUIZ PAGE ================= */
async function quizPage() {
  const msg = qs("msg");
  const quizId = getParam("quizId");

  if (!quizId) {
    msg.textContent = "Missing quizId";
    return;
  }

  try {
    const data = await api(`/api/quiz/${quizId}`);

    qs("quizTitle").textContent = data.quiz.title;
    qs("passInfo").textContent = `Pass Score: ${data.quiz.pass_score}%`;

    const form = qs("quizForm");
    form.innerHTML = "";

    data.questions.forEach((q, idx) => {
      const wrap = document.createElement("div");
      wrap.className = "question";

      wrap.innerHTML = `<h3>Q${idx + 1}. ${q.text}</h3>`;

      q.options.forEach((opt) => {
        const label = document.createElement("label");
        label.innerHTML = `
          <input type="radio" name="q_${q.id}" value="${opt.id}" />
          ${opt.text}
        `;
        wrap.appendChild(label);
      });

      form.appendChild(wrap);
    });

    qs("submitBtn").onclick = async () => {
      try {
        msg.textContent = "";
        const answers = {};

        data.questions.forEach((q) => {
          const picked = document.querySelector(
            `input[name="q_${q.id}"]:checked`
          );
          if (picked) answers[String(q.id)] = Number(picked.value);
        });

        const submitRes = await api(
          `/api/quiz/${quizId}/submit`,
          "POST",
          { answers }
        );

        window.location.href = `/result?attemptId=${submitRes.attemptId}`;
      } catch (e) {
        msg.textContent = e.message;
        msg.classList.add("error");
      }
    };

  } catch (e) {
    msg.textContent = e.message;
    msg.classList.add("error");
  }
}

/* ================= RESULT PAGE ================= */
async function resultPage() {
  const msg = qs("msg");
  const attemptId = getParam("attemptId");

  if (!attemptId) {
    msg.textContent = "Missing attemptId";
    return;
  }

  try {
    const data = await api(`/api/result/${attemptId}`);
    const a = data.attempt;

    qs("resultCard").innerHTML = `
      <h2>${a.quiz_title}</h2>
      <p><b>Score:</b> ${a.score}/${a.total}</p>
      <p><b>Percentage:</b> ${a.percentage}%</p>
      <p><b>Status:</b> ${
        a.passed
          ? `<span style="color:#22c55e">PASSED ✅</span>`
          : `<span style="color:#ef4444">FAILED ❌</span>`
      }</p>
    `;

    const certBtn = qs("certBtn");

    if (a.passed) {
      certBtn.classList.remove("hidden");
      certBtn.onclick = () => {
        const name = encodeURIComponent(
          qs("certName").value.trim() || "Student"
        );
        window.location.href =
          `/api/result/${attemptId}/certificate?name=${name}`;
      };
    }

    qs("backBtn").onclick = () => {
      window.location.href = "/select";
    };

  } catch (e) {
    msg.textContent = e.message;
    msg.classList.add("error");
  }
}

/* ================= PAGE ROUTER ================= */
const page = document.body.getAttribute("data-page");

if (page === "select") selectPage();
if (page === "quiz") quizPage();
if (page === "result") resultPage();