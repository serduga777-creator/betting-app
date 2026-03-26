require("dotenv").config();

const express = require("express");
const cors = require("cors");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const pool = require("./db");

const app = express();
const ADMIN_EMAIL = "admin@test.com";

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

app.use(
  session({
    secret: process.env.SESSION_SECRET || "demo-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  })
);

const demoMatches = [
  {
    id: 1,
    team1: "Real Madrid",
    team2: "Barcelona",
    league: "La Liga",
    odds: { home: 2.1, draw: 3.5, away: 3.0 }
  },
  {
    id: 2,
    team1: "Man City",
    team2: "Liverpool",
    league: "Premier League",
    odds: { home: 1.9, draw: 3.8, away: 3.4 }
  },
  {
    id: 3,
    team1: "Bayern",
    team2: "Dortmund",
    league: "Bundesliga",
    odds: { home: 1.7, draw: 4.0, away: 4.5 }
  }
];

function normalizeStatus(status) {
  return String(status || "").trim().toLowerCase();
}

async function getUser(req) {
  if (!req.session.userId) return null;

  const result = await pool.query(
    "SELECT id, email, balance, created_at FROM users WHERE id = $1 LIMIT 1",
    [req.session.userId]
  );

  if (!result.rows.length) {
    req.session.userId = null;
    return null;
  }

  return result.rows[0];
}

function isAdmin(user) {
  return !!user && String(user.email || "").trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

function pageTemplate(title, content) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    * { box-sizing: border-box; }

    :root {
      --bg: #eef3fb;
      --card: rgba(255,255,255,0.92);
      --card-strong: #ffffff;
      --text: #0f172a;
      --muted: #64748b;
      --line: #dbe4f0;

      --blue: #2563eb;
      --blue-dark: #1d4ed8;
      --blue-soft: #eaf2ff;

      --green: #16a34a;
      --green-soft: #dcfce7;

      --red: #dc2626;
      --red-soft: #fee2e2;

      --yellow: #d97706;
      --yellow-soft: #fef3c7;

      --purple: #7c3aed;
      --purple-soft: #ede9fe;

      --shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
      --radius: 24px;
    }

    html, body {
      margin: 0;
      padding: 0;
      font-family: Arial, sans-serif;
      color: var(--text);
      background:
        radial-gradient(circle at top left, #f8fbff 0%, #eef3fb 45%, #e8eef9 100%);
    }

    body { min-height: 100vh; }

    .container {
      max-width: 1180px;
      margin: 0 auto;
      padding: 18px;
    }

    .topbar {
      background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,255,255,0.88));
      border: 1px solid rgba(255,255,255,0.7);
      border-radius: 28px;
      padding: 20px;
      margin-bottom: 18px;
      box-shadow: var(--shadow);
      backdrop-filter: blur(12px);
    }

    .topbar-row {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      align-items: center;
    }

    .pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 15px;
      border-radius: 999px;
      background: var(--blue-soft);
      color: var(--blue-dark);
      font-weight: 700;
      font-size: 15px;
      border: 1px solid #dce8ff;
    }

    .pill.gray {
      background: #f3f6fb;
      color: #334155;
      border: 1px solid #e3eaf4;
    }

    .pill.admin {
      background: var(--purple-soft);
      color: #5b21b6;
      border: 1px solid #ddd6fe;
    }

    .nav {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 20px;
    }

    .nav a {
      text-decoration: none;
      color: var(--blue-dark);
      background: rgba(255,255,255,0.72);
      border: 1px solid #dde7f4;
      padding: 12px 16px;
      border-radius: 16px;
      font-weight: 700;
      box-shadow: 0 6px 16px rgba(15, 23, 42, 0.04);
      transition: 0.18s ease;
    }

    .nav a:hover {
      transform: translateY(-1px);
      background: white;
    }

    .card {
      background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,255,255,0.90));
      border: 1px solid rgba(223,231,243,0.95);
      border-radius: var(--radius);
      padding: 26px;
      margin-bottom: 20px;
      box-shadow: var(--shadow);
    }

    .hero {
      background:
        radial-gradient(circle at top right, rgba(96,165,250,0.28), transparent 30%),
        linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%);
      color: white;
      border-radius: 30px;
      padding: 38px 28px;
      box-shadow: 0 22px 48px rgba(29, 78, 216, 0.22);
      margin-bottom: 20px;
      overflow: hidden;
      position: relative;
    }

    .hero h1 {
      margin: 0 0 12px 0;
      font-size: 40px;
      line-height: 1.08;
      letter-spacing: -0.02em;
    }

    .hero p {
      margin: 0;
      max-width: 760px;
      line-height: 1.65;
      font-size: 18px;
      color: rgba(255,255,255,0.92);
    }

    h1, h2, h3 {
      margin-top: 0;
      letter-spacing: -0.02em;
    }

    h1 {
      font-size: 34px;
      margin-bottom: 12px;
    }

    h2 {
      font-size: 28px;
      margin-bottom: 14px;
    }

    h3 {
      font-size: 22px;
    }

    .muted {
      color: var(--muted);
      line-height: 1.7;
      font-size: 17px;
    }

    input, button, textarea, select {
      width: 100%;
      margin: 8px 0;
      padding: 15px 16px;
      border-radius: 16px;
      border: 1px solid var(--line);
      font-size: 16px;
      outline: none;
      transition: 0.18s ease;
    }

    input:focus, textarea:focus, select:focus {
      border-color: #93c5fd;
      box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.10);
    }

    button {
      border: none;
      background: linear-gradient(180deg, #3b82f6, #2563eb);
      color: white;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 10px 20px rgba(37, 99, 235, 0.22);
    }

    button:hover {
      transform: translateY(-1px);
      filter: brightness(1.02);
    }

    button:active {
      transform: translateY(0);
    }

    .btn-gray {
      background: linear-gradient(180deg, #64748b, #475569);
      box-shadow: 0 10px 20px rgba(71, 85, 105, 0.18);
    }

    .btn-green {
      background: linear-gradient(180deg, #22c55e, #16a34a);
      box-shadow: 0 10px 20px rgba(22, 163, 74, 0.18);
    }

    .btn-red {
      background: linear-gradient(180deg, #ef4444, #dc2626);
      box-shadow: 0 10px 20px rgba(220, 38, 38, 0.18);
    }

    .btn-orange {
      background: linear-gradient(180deg, #fb923c, #ea580c);
      box-shadow: 0 10px 20px rgba(234, 88, 12, 0.18);
    }

    .message {
      margin-top: 12px;
      padding: 14px 16px;
      border-radius: 16px;
      font-weight: 700;
      display: none;
      border: 1px solid transparent;
    }

    .message.success {
      display: block;
      background: var(--green-soft);
      color: #166534;
      border-color: #bbf7d0;
    }

    .message.error {
      display: block;
      background: var(--red-soft);
      color: #991b1b;
      border-color: #fecaca;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
    }

    .two-cols {
      display: grid;
      grid-template-columns: 1.4fr 1fr;
      gap: 20px;
    }

    .info-box {
      background: linear-gradient(180deg, #f7faff, #eef5ff);
      border-radius: 20px;
      padding: 18px;
      border: 1px solid #dce8ff;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 14px;
    }

    .stat {
      background: linear-gradient(180deg, #f8fbff, #eef4ff);
      border-radius: 20px;
      padding: 20px;
      border: 1px solid #dde8fb;
      min-height: 126px;
    }

    .stat .label {
      color: #475569;
      margin-bottom: 12px;
      font-size: 15px;
    }

    .stat .value {
      color: var(--blue-dark);
      font-size: 30px;
      font-weight: 800;
      line-height: 1.15;
      word-break: break-word;
    }

    .stat.win-stat {
      background: linear-gradient(180deg, #ebfbef, #dcfce7);
      border-color: #bbf7d0;
    }

    .stat.lose-stat {
      background: linear-gradient(180deg, #fff1f1, #fee2e2);
      border-color: #fecaca;
    }

    .stat.total-stat {
      background: linear-gradient(180deg, #f3efff, #ede9fe);
      border-color: #ddd6fe;
    }

    .match-card {
      border: 1px solid #e2e8f0;
      border-radius: 24px;
      padding: 22px;
      margin-bottom: 16px;
      background: linear-gradient(180deg, #ffffff, #f8fbff);
      box-shadow: 0 10px 22px rgba(15, 23, 42, 0.04);
      transition: 0.18s ease;
    }

    .match-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 16px 28px rgba(15, 23, 42, 0.07);
    }

    .league {
      display: inline-block;
      background: #eef2ff;
      color: #4338ca;
      border-radius: 999px;
      padding: 7px 11px;
      font-size: 12px;
      font-weight: 800;
      margin-bottom: 12px;
    }

    .match-title {
      font-size: 24px;
      font-weight: 800;
      margin-bottom: 8px;
      letter-spacing: -0.02em;
    }

    .divider {
      height: 1px;
      background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
      margin: 18px 0;
    }

    .odds {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12px;
    }

    .odds button {
      min-height: 88px;
      border-radius: 20px;
      font-size: 17px;
      font-weight: 800;
      line-height: 1.35;
    }

    .odds button:nth-child(1) {
      background: linear-gradient(180deg, #3b82f6, #1d4ed8);
    }

    .odds button:nth-child(2) {
      background: linear-gradient(180deg, #0f766e, #0f766e);
    }

    .odds button:nth-child(3) {
      background: linear-gradient(180deg, #5b43e6, #4338ca);
    }

    .betslip-shell {
      position: sticky;
      top: 18px;
    }

    .bet-row, .history-row, .user-row {
      border: 1px solid #e5e7eb;
      border-radius: 22px;
      padding: 18px;
      margin-bottom: 14px;
      background: linear-gradient(180deg, #ffffff, #fcfdff);
      box-shadow: 0 10px 20px rgba(15, 23, 42, 0.04);
    }

    .bet.pending-box {
      border: 2px solid #fcd34d;
      background: linear-gradient(180deg, #fffdf3, #fffbeb);
    }

    .bet.win-box {
      border: 2px solid #9ae6b4;
      background: linear-gradient(180deg, #f3fff7, #f0fdf4);
    }

    .bet.lose-box {
      border: 2px solid #fca5a5;
      background: linear-gradient(180deg, #fff5f5, #fef2f2);
    }

    .bet-title {
      font-size: 22px;
      font-weight: 800;
      margin-bottom: 6px;
      line-height: 1.25;
    }

    .bet-meta {
      color: var(--muted);
      font-size: 16px;
      margin-bottom: 12px;
    }

    .status {
      display: inline-block;
      margin-top: 12px;
      padding: 8px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .pending {
      background: var(--yellow-soft);
      color: #92400e;
    }

    .win {
      background: var(--green-soft);
      color: #166534;
    }

    .lose {
      background: var(--red-soft);
      color: #991b1b;
    }

    .action-row {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 16px;
    }

    .action-row button {
      width: auto;
      min-width: 132px;
      margin: 0;
    }

    .amount-plus {
      color: #15803d;
      font-weight: 800;
    }

    .amount-minus {
      color: #b91c1c;
      font-weight: 800;
    }

    .warn-box {
      background: linear-gradient(180deg, #fff7ed, #ffedd5);
      border: 2px solid #fdba74;
      color: #9a3412;
      border-radius: 20px;
      padding: 18px;
      line-height: 1.65;
    }

    .mono {
      font-family: monospace;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .slip-balance {
      background: linear-gradient(180deg, #f0fdf4, #dcfce7);
      border: 2px solid #bbf7d0;
    }

    .slip-empty {
      text-align: center;
      padding: 22px;
      border: 2px dashed #c7d7ee;
      background: linear-gradient(180deg, #f8fbff, #eef5ff);
    }

    .slip-selected {
      border-radius: 22px;
      padding: 18px;
      background: linear-gradient(180deg, #f8fbff, #eef4ff);
      border: 1px solid #d7e6fb;
      margin-bottom: 12px;
    }

    .slip-selected .small {
      color: var(--muted);
      font-size: 14px;
      margin-bottom: 8px;
    }

    .slip-selected .big {
      font-size: 24px;
      font-weight: 800;
      line-height: 1.2;
      margin-bottom: 8px;
    }

    .slip-selection {
      color: #64748b;
      font-size: 16px;
      margin-bottom: 10px;
    }

    .slip-win {
      border-radius: 20px;
      padding: 18px;
      background: linear-gradient(180deg, #eef7ff, #e0efff);
      border: 1px solid #cfe2ff;
      margin-top: 8px;
      margin-bottom: 12px;
    }

    .slip-win-label {
      color: #64748b;
      font-size: 14px;
      margin-bottom: 8px;
    }

    .slip-win-value {
      font-size: 42px;
      font-weight: 800;
      color: var(--blue-dark);
      line-height: 1;
    }

    .section-subtitle {
      color: var(--muted);
      margin-top: -4px;
      margin-bottom: 14px;
      line-height: 1.7;
    }

    @media (max-width: 900px) {
      .two-cols {
        grid-template-columns: 1fr;
      }

      .odds {
        grid-template-columns: 1fr;
      }

      .hero {
        padding: 28px 22px;
      }

      .hero h1 {
        font-size: 30px;
      }

      .hero p {
        font-size: 16px;
      }

      .card {
        padding: 20px;
      }

      .stat {
        min-height: unset;
      }

      .betslip-shell {
        position: static;
      }
    }

    @media (max-width: 560px) {
      .container {
        padding: 14px;
      }

      .topbar,
      .card {
        border-radius: 22px;
      }

      h1 { font-size: 28px; }
      h2 { font-size: 24px; }

      .match-title,
      .bet-title,
      .slip-selected .big {
        font-size: 20px;
      }

      .stat .value {
        font-size: 24px;
      }

      .slip-win-value {
        font-size: 34px;
      }

      .action-row {
        flex-direction: column;
      }

      .action-row button {
        width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    ${content}
  </div>
</body>
</html>
  `;
}

async function renderLayout(req, title, innerHtml) {
  const user = await getUser(req);
  const admin = isAdmin(user);

  return pageTemplate(title, `
    <div class="topbar">
      <div class="topbar-row">
        <div class="pill gray">MVP demo</div>
        <div class="pill ${user ? "" : "gray"}">${user ? "Logged in" : "Guest"}</div>
        ${user ? `<div class="pill">${user.email}</div>` : ""}
        ${user ? `<div class="pill">Balance: ${user.balance}</div>` : ""}
        ${admin ? `<div class="pill admin">Admin</div>` : ""}
      </div>

      <div class="action-row" style="margin-top:14px;">
        <button onclick="refreshUser()">Refresh user</button>
        <button class="btn-gray" onclick="logoutUser()">Logout</button>
      </div>
    </div>

    <div class="nav">
      <a href="/">Home</a>
      <a href="/register">Register</a>
      <a href="/login">Login</a>
      <a href="/matches">Matches</a>
      <a href="/dashboard">Dashboard</a>
      <a href="/balance-history">Balance history</a>
      ${admin ? `<a href="/admin">Admin</a>` : ""}
      ${admin ? `<a href="/users">Users</a>` : ""}
      ${admin ? `<a href="/bets">Bets</a>` : ""}
    </div>

    ${innerHtml}

    <script>
      async function refreshUser() {
        try {
          await fetch("/me", { credentials: "include", cache: "no-store" });
          window.location.reload();
        } catch (e) {
          window.location.reload();
        }
      }

      async function logoutUser() {
        await fetch("/logout", {
          method: "POST",
          credentials: "include"
        });
        window.location.href = "/login";
      }
    </script>
  `);
}

function loginRequiredInner(title) {
  return `
    <div class="card">
      <h1>${title}</h1>
      <p class="muted">Please login first to access this page.</p>
      <div class="action-row">
        <a href="/login" style="text-decoration:none;">Go to login</a>
      </div>
    </div>
  `;
}

function accessDeniedInner() {
  return `
    <div class="card">
      <h1>Access denied</h1>
      <div class="warn-box">
        This page is available only for admin user: <strong>${ADMIN_EMAIL}</strong>
      </div>
    </div>
  `;
}

app.get("/", async (req, res) => {
  const html = await renderLayout(req, "Home", `
    <div class="hero">
      <h1>Practice betting without real money</h1>
      <p>
        Demo betting app with account system, virtual balance, matches, bet history,
        balance history and admin settlement panel.
      </p>
    </div>
  `);

  res.send(html);
});

app.get("/init-db", async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE,
        password TEXT,
        balance NUMERIC DEFAULT 1000,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS bets (
        id SERIAL PRIMARY KEY,
        user_id INT,
        match_name TEXT,
        selection TEXT,
        odds FLOAT,
        stake NUMERIC,
        possible_win NUMERIC,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS balance_history (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        amount NUMERIC NOT NULL,
        type TEXT NOT NULL,
        description TEXT,
        bet_id INT,
        balance_after NUMERIC NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
});

app.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.json({ ok: false, message: "Email and password required" });
    }

    const existing = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existing.rows.length) {
      return res.json({ ok: false, message: "User already exists" });
    }

    const hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email, balance, created_at",
      [email, hash]
    );

    req.session.userId = result.rows[0].id;
    res.json({ ok: true, user: result.rows[0] });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1 LIMIT 1",
      [email]
    );

    if (!result.rows.length) {
      return res.json({ ok: false, message: "Invalid credentials" });
    }

    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password);

    if (!ok) {
      return res.json({ ok: false, message: "Invalid credentials" });
    }

    req.session.userId = user.id;

    res.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        balance: user.balance,
        created_at: user.created_at
      }
    });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
});

app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

app.get("/me", async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.json({ ok: false, message: "Not logged in" });
    res.json({ ok: true, user });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
});

app.get("/register", async (req, res) => {
  const html = await renderLayout(req, "Register", `
    <div class="card">
      <h1>Create account</h1>
      <p class="muted">Start with a virtual balance and test the full betting flow.</p>
      <input id="email" placeholder="Email" />
      <input id="password" type="password" placeholder="Password" />
      <button onclick="registerUser()">Register</button>
      <div id="msg" class="message"></div>
    </div>

    <script>
      function showMessage(text, type) {
        const box = document.getElementById("msg");
        box.className = "message " + type;
        box.style.display = "block";
        box.textContent = text;
      }

      async function registerUser() {
        const res = await fetch("/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            email: document.getElementById("email").value,
            password: document.getElementById("password").value
          })
        });

        const data = await res.json();

        if (!data.ok) {
          showMessage(data.message || "Register failed", "error");
          return;
        }

        showMessage("Account created successfully", "success");
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 500);
      }
    </script>
  `);

  res.send(html);
});

app.get("/login", async (req, res) => {
  const html = await renderLayout(req, "Login", `
    <div class="card">
      <h1>Login</h1>
      <p class="muted">Login to place bets and track your dashboard.</p>
      <input id="email" placeholder="Email" />
      <input id="password" type="password" placeholder="Password" />
      <button onclick="loginUser()">Login</button>
      <div id="msg" class="message"></div>
    </div>

    <script>
      function showMessage(text, type) {
        const box = document.getElementById("msg");
        box.className = "message " + type;
        box.style.display = "block";
        box.textContent = text;
      }

      async function loginUser() {
        const res = await fetch("/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            email: document.getElementById("email").value,
            password: document.getElementById("password").value
          })
        });

        const data = await res.json();

        if (!data.ok) {
          showMessage(data.message || "Login failed", "error");
          return;
        }

        showMessage("Login successful", "success");
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 500);
      }
    </script>
  `);

  res.send(html);
});

app.post("/place-bet", async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.json({ ok: false, message: "Not logged in" });

    const { match_name, selection, odds, stake } = req.body;

    if (!match_name || !selection || !odds || !stake) {
      return res.json({ ok: false, message: "Missing bet data" });
    }

    if (Number(stake) <= 0) {
      return res.json({ ok: false, message: "Invalid stake" });
    }

    if (Number(user.balance) < Number(stake)) {
      return res.json({ ok: false, message: "Not enough balance" });
    }

    const possibleWin = Number(odds) * Number(stake);
    const newBalance = Number(user.balance) - Number(stake);

    await pool.query(
      "UPDATE users SET balance = balance - $1 WHERE id = $2",
      [stake, user.id]
    );

    const betResult = await pool.query(
      `INSERT INTO bets (user_id, match_name, selection, odds, stake, possible_win)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [user.id, match_name, selection, odds, stake, possibleWin]
    );

    const bet = betResult.rows[0];

    await pool.query(
      `INSERT INTO balance_history (user_id, amount, type, description, bet_id, balance_after)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        user.id,
        -Math.abs(Number(stake)),
        "bet_stake",
        `Stake for ${match_name} / ${selection}`,
        bet.id,
        newBalance
      ]
    );

    res.json({ ok: true, bet, newBalance });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
});

app.post("/settle-bet", async (req, res) => {
  try {
    const user = await getUser(req);

    if (!isAdmin(user)) {
      return res.json({ ok: false, message: "Admin access required" });
    }

    const { betId, status } = req.body;

    if (status !== "win" && status !== "lose") {
      return res.json({ ok: false, message: "Invalid status" });
    }

    const betResult = await pool.query(
      "SELECT * FROM bets WHERE id = $1",
      [betId]
    );

    if (!betResult.rows.length) {
      return res.json({ ok: false, message: "Bet not found" });
    }

    const bet = betResult.rows[0];

    if (normalizeStatus(bet.status) !== "pending") {
      return res.json({ ok: false, message: "Bet already settled" });
    }

    await pool.query(
      "UPDATE bets SET status = $1 WHERE id = $2",
      [status, betId]
    );

    let newBalance = null;

    if (status === "win") {
      await pool.query(
        "UPDATE users SET balance = balance + $1 WHERE id = $2",
        [bet.possible_win, bet.user_id]
      );

      const userResult = await pool.query(
        "SELECT balance FROM users WHERE id = $1",
        [bet.user_id]
      );

      newBalance = Number(userResult.rows[0].balance);

      await pool.query(
        `INSERT INTO balance_history (user_id, amount, type, description, bet_id, balance_after)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          bet.user_id,
          Number(bet.possible_win),
          "bet_win",
          `Win payout for ${bet.match_name} / ${bet.selection}`,
          bet.id,
          newBalance
        ]
      );
    } else {
      const userResult = await pool.query(
        "SELECT balance FROM users WHERE id = $1",
        [bet.user_id]
      );
      newBalance = Number(userResult.rows[0].balance);
    }

    res.json({ ok: true, message: "Bet settled", newBalance });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
});

app.post("/delete-bet", async (req, res) => {
  try {
    const user = await getUser(req);

    if (!isAdmin(user)) {
      return res.json({ ok: false, message: "Admin access required" });
    }

    const { betId } = req.body;

    const betResult = await pool.query(
      "SELECT * FROM bets WHERE id = $1",
      [betId]
    );

    if (!betResult.rows.length) {
      return res.json({ ok: false, message: "Bet not found" });
    }

    const bet = betResult.rows[0];

    if (normalizeStatus(bet.status) === "pending") {
      await pool.query(
        "UPDATE users SET balance = balance + $1 WHERE id = $2",
        [bet.stake, bet.user_id]
      );

      const userResult = await pool.query(
        "SELECT balance FROM users WHERE id = $1",
        [bet.user_id]
      );

      const refundedBalance = Number(userResult.rows[0].balance);

      await pool.query(
        `INSERT INTO balance_history (user_id, amount, type, description, bet_id, balance_after)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          bet.user_id,
          Number(bet.stake),
          "bet_refund",
          `Refund for deleted pending bet: ${bet.match_name} / ${bet.selection}`,
          bet.id,
          refundedBalance
        ]
      );
    }

    await pool.query("DELETE FROM bets WHERE id = $1", [betId]);

    res.json({ ok: true, message: "Bet deleted" });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
});

app.get("/api/my-bets", async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.json({ ok: false, message: "Not logged in" });

    const result = await pool.query(
      "SELECT * FROM bets WHERE user_id = $1 ORDER BY id DESC",
      [user.id]
    );

    res.json({ ok: true, bets: result.rows });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
});

app.get("/api/balance-history", async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.json({ ok: false, message: "Not logged in" });

    const result = await pool.query(
      "SELECT * FROM balance_history WHERE user_id = $1 ORDER BY id DESC",
      [user.id]
    );

    res.json({ ok: true, history: result.rows });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
});

app.get("/matches", async (req, res) => {
  const user = await getUser(req);
  if (!user) {
    const html = await renderLayout(req, "Matches", loginRequiredInner("Matches"));
    return res.send(html);
  }

  const html = await renderLayout(req, "Matches", `
    <div class="card">
      <h1>Matches</h1>
      <p class="section-subtitle">Choose an outcome, enter your stake, and place a bet from the bet slip.</p>
    </div>

    <div class="two-cols">
      <div class="card">
        <h2>Available matches</h2>

        ${demoMatches.map(match => `
          <div class="match-card">
            <div class="league">${match.league}</div>
            <div class="match-title">${match.team1} vs ${match.team2}</div>
            <div class="muted">Select one of the available outcomes below.</div>
            <div class="divider"></div>

            <div class="odds">
              <button onclick="selectBet(${match.id}, 'Home', ${match.odds.home})">
                ${match.team1}<br>${match.odds.home}
              </button>

              <button onclick="selectBet(${match.id}, 'Draw', ${match.odds.draw})">
                Draw<br>${match.odds.draw}
              </button>

              <button onclick="selectBet(${match.id}, 'Away', ${match.odds.away})">
                ${match.team2}<br>${match.odds.away}
              </button>
            </div>
          </div>
        `).join("")}
      </div>

      <div class="betslip-shell">
        <div class="card">
          <h2>Bet slip</h2>

          <div class="stat slip-balance" style="margin-bottom:16px;">
            <div class="label" style="color:#166534;">Current balance</div>
            <div class="value" id="balanceBox" style="color:#166534;">${user.balance}</div>
          </div>

          <div id="emptySlip" class="slip-empty">
            <p class="muted" style="margin:0;">Choose any match outcome to prepare your bet.</p>
          </div>

          <div id="slipContent" style="display:none;">
            <div class="slip-selected">
              <div class="small">Your selected outcome</div>
              <div class="big" id="slipMatch"></div>
              <div class="slip-selection" id="slipSelection"></div>
              <div><strong>Odds:</strong> <span id="slipOdds"></span></div>
            </div>

            <input id="slipStake" placeholder="Stake" oninput="updateWin()" />

            <div class="slip-win">
              <div class="slip-win-label">Potential return</div>
              <div style="font-size:18px; font-weight:bold; margin-bottom:8px;">Possible win</div>
              <div class="slip-win-value" id="possibleWin">0</div>
            </div>

            <button onclick="placeBet()">Place bet</button>
          </div>

          <div id="msg" class="message"></div>
        </div>
      </div>
    </div>

    <script>
      const matches = ${JSON.stringify(demoMatches)};
      let selectedBet = null;

      function showMessage(text, type) {
        const box = document.getElementById("msg");
        box.className = "message " + type;
        box.style.display = "block";
        box.textContent = text;
      }

      function selectBet(matchId, selection, odds) {
        const match = matches.find(m => m.id === matchId);

        const selectionText =
          selection === "Home" ? match.team1 + " win" :
          selection === "Away" ? match.team2 + " win" :
          "Draw";

        selectedBet = {
          match_name: match.team1 + " vs " + match.team2,
          selection: selectionText,
          odds: Number(odds)
        };

        document.getElementById("emptySlip").style.display = "none";
        document.getElementById("slipContent").style.display = "block";
        document.getElementById("slipMatch").textContent = selectedBet.match_name;
        document.getElementById("slipSelection").textContent = selectedBet.selection;
        document.getElementById("slipOdds").textContent = selectedBet.odds;
        document.getElementById("slipStake").value = "";
        document.getElementById("possibleWin").textContent = "0";
        document.getElementById("msg").style.display = "none";
      }

      function updateWin() {
        if (!selectedBet) return;
        const stake = Number(document.getElementById("slipStake").value || 0);
        const value = stake * selectedBet.odds;
        document.getElementById("possibleWin").textContent = value ? value : 0;
      }

      async function placeBet() {
        if (!selectedBet) return;

        const stake = Number(document.getElementById("slipStake").value || 0);

        const res = await fetch("/place-bet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            match_name: selectedBet.match_name,
            selection: selectedBet.selection,
            odds: selectedBet.odds,
            stake
          })
        });

        const data = await res.json();

        if (!data.ok) {
          showMessage(data.message || "Could not place bet", "error");
          return;
        }

        document.getElementById("balanceBox").textContent = data.newBalance;
        document.getElementById("slipStake").value = "";
        document.getElementById("possibleWin").textContent = "0";
        showMessage("Bet placed successfully", "success");
      }
    </script>
  `);

  res.send(html);
});

app.get("/dashboard", async (req, res) => {
  const user = await getUser(req);
  if (!user) {
    const html = await renderLayout(req, "Dashboard", loginRequiredInner("Dashboard"));
    return res.send(html);
  }

  const html = await renderLayout(req, "Dashboard", `
    <div class="card">
      <h1>My dashboard</h1>
      <p class="muted">See your account, current balance, and all your bets in one place.</p>
      <div class="action-row">
        <button onclick="loadDashboard()">Refresh dashboard</button>
        <button class="btn-gray" onclick="logoutUser()">Logout</button>
      </div>
      <div id="dashMsg" class="message"></div>
    </div>

    <div id="dashboardContent" class="card">Loading...</div>

    <script>
      function showDashError(text) {
        const box = document.getElementById("dashMsg");
        box.className = "message error";
        box.style.display = "block";
        box.textContent = text;
      }

      function normalizeStatus(status) {
        return String(status || "").trim().toLowerCase();
      }

      async function loadDashboard() {
        try {
          const meRes = await fetch("/me", {
            credentials: "include",
            cache: "no-store"
          });
          const meData = await meRes.json();

          if (!meData.ok) {
            window.location.href = "/login";
            return;
          }

          const betsRes = await fetch("/api/my-bets", {
            credentials: "include",
            cache: "no-store"
          });
          const betsData = await betsRes.json();

          const historyRes = await fetch("/api/balance-history", {
            credentials: "include",
            cache: "no-store"
          });
          const historyData = await historyRes.json();

          if (!betsData.ok) {
            throw new Error(betsData.message || "Could not load bets");
          }

          if (!historyData.ok) {
            throw new Error(historyData.message || "Could not load balance history");
          }

          const bets = betsData.bets || [];
          const history = historyData.history || [];

          const pending = bets.filter(b => normalizeStatus(b.status) === "pending").length;
          const wins = bets.filter(b => normalizeStatus(b.status) === "win").length;
          const loses = bets.filter(b => normalizeStatus(b.status) === "lose").length;

          const totalStaked = bets.reduce((sum, b) => sum + Number(b.stake || 0), 0);
          const totalWon = history.filter(h => h.type === "bet_win").reduce((sum, h) => sum + Number(h.amount || 0), 0);
          const totalRefund = history.filter(h => h.type === "bet_refund").reduce((sum, h) => sum + Number(h.amount || 0), 0);
          const profit = totalWon + totalRefund - totalStaked;

          document.getElementById("dashboardContent").innerHTML = \`
            <h2>Account</h2>
            <div class="stats">
              <div class="stat">
                <div class="label">Email</div>
                <div class="value" style="font-size:18px;">\${meData.user.email}</div>
              </div>
              <div class="stat">
                <div class="label">Balance</div>
                <div class="value">\${meData.user.balance}</div>
              </div>
              <div class="stat">
                <div class="label">User ID</div>
                <div class="value">\${meData.user.id}</div>
              </div>
            </div>

            <h2 style="margin-top:24px;">My stats</h2>
            <div class="stats">
              <div class="stat">
                <div class="label">Total bets</div>
                <div class="value">\${bets.length}</div>
              </div>
              <div class="stat">
                <div class="label">Pending</div>
                <div class="value">\${pending}</div>
              </div>
              <div class="stat win-stat">
                <div class="label">Wins</div>
                <div class="value">\${wins}</div>
              </div>
              <div class="stat lose-stat">
                <div class="label">Loses</div>
                <div class="value">\${loses}</div>
              </div>
              <div class="stat total-stat">
                <div class="label">Total staked</div>
                <div class="value">\${totalStaked}</div>
              </div>
              <div class="stat \${profit >= 0 ? "win-stat" : "lose-stat"}">
                <div class="label">Profit</div>
                <div class="value">\${profit}</div>
              </div>
            </div>

            <h2 style="margin-top:24px;">My bets</h2>
            \${bets.length === 0 ? "<p>No bets yet.</p>" : bets.map(b => {
              const s = normalizeStatus(b.status);
              return \`
                <div class="bet \${s}-box bet-row">
                  <div class="bet-title">\${b.match_name}</div>
                  <div class="bet-meta">Selection: \${b.selection}</div>
                  <div><strong>ID:</strong> \${b.id}</div>
                  <div><strong>Odds:</strong> \${b.odds}</div>
                  <div><strong>Stake:</strong> \${b.stake}</div>
                  <div><strong>Possible win:</strong> \${b.possible_win}</div>
                  <div><span class="status \${s}">\${s}</span></div>
                </div>
              \`;
            }).join("")}
          \`;
        } catch (err) {
          showDashError(err.message || "Dashboard loading failed");
          document.getElementById("dashboardContent").innerHTML = "<p>Could not load dashboard.</p>";
        }
      }

      loadDashboard();
    </script>
  `);

  res.send(html);
});

app.get("/balance-history", async (req, res) => {
  const user = await getUser(req);
  if (!user) {
    const html = await renderLayout(req, "Balance history", loginRequiredInner("Balance history"));
    return res.send(html);
  }

  const html = await renderLayout(req, "Balance history", `
    <div class="card">
      <h1>Balance history</h1>
      <p class="muted">See every balance movement: stakes, refunds and winnings.</p>
      <button onclick="loadHistory()" style="width:auto;">Refresh history</button>
    </div>

    <div id="historyContent" class="card">Loading...</div>

    <script>
      async function loadHistory() {
        const res = await fetch("/api/balance-history", {
          credentials: "include",
          cache: "no-store"
        });

        const data = await res.json();

        if (!data.ok) {
          document.getElementById("historyContent").innerHTML = "Could not load history.";
          return;
        }

        const rows = data.history || [];

        document.getElementById("historyContent").innerHTML = \`
          <h2>Entries</h2>
          \${rows.length === 0 ? "<p>No balance changes yet.</p>" : rows.map(r => \`
            <div class="history-row">
              <div><strong>Type:</strong> \${r.type}</div>
              <div><strong>Description:</strong> \${r.description || "-"}</div>
              <div><strong>Bet ID:</strong> \${r.bet_id || "-"}</div>
              <div><strong>Amount:</strong> <span class="\${Number(r.amount) >= 0 ? "amount-plus" : "amount-minus"}">\${r.amount}</span></div>
              <div><strong>Balance after:</strong> \${r.balance_after}</div>
              <div><strong>Created:</strong> \${r.created_at}</div>
            </div>
          \`).join("")}
        \`;
      }

      loadHistory();
    </script>
  `);

  res.send(html);
});

app.get("/admin", async (req, res) => {
  const user = await getUser(req);

  if (!user) {
    const html = await renderLayout(req, "Admin", loginRequiredInner("Admin"));
    return res.send(html);
  }

  if (!isAdmin(user)) {
    const html = await renderLayout(req, "Admin", accessDeniedInner());
    return res.send(html);
  }

  const html = await renderLayout(req, "Admin", `
    <div class="card">
      <h1>Admin panel</h1>
      <p class="muted">Manage bets: settle or delete them.</p>
      <button onclick="loadBets()" style="width:auto;">Refresh bets</button>
      <div id="msg" class="message"></div>
    </div>

    <div id="betsBox" class="card">Loading...</div>

    <script>
      function showMessage(text, type) {
        const box = document.getElementById("msg");
        box.className = "message " + type;
        box.style.display = "block";
        box.textContent = text;
        setTimeout(() => { box.style.display = "none"; }, 2400);
      }

      function normalizeStatus(status) {
        return String(status || "").trim().toLowerCase();
      }

      function statusBadge(status) {
        const s = normalizeStatus(status);
        const cls = s === "win" ? "win" : s === "lose" ? "lose" : "pending";
        return '<span class="status ' + cls + '">' + s + '</span>';
      }

      function cardClass(status) {
        const s = normalizeStatus(status);
        if (s === "win") return "win-box";
        if (s === "lose") return "lose-box";
        return "pending-box";
      }

      async function settleBet(betId, status) {
        const res = await fetch("/settle-bet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ betId, status })
        });

        const data = await res.json();

        if (!data.ok) {
          showMessage(data.message || "Settle failed", "error");
          return;
        }

        showMessage("Bet #" + betId + " settled as " + status.toUpperCase(), "success");
        loadBets();
      }

      async function deleteBet(betId) {
        const ok = confirm("Delete bet #" + betId + "? Pending bet will be refunded.");
        if (!ok) return;

        const res = await fetch("/delete-bet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ betId })
        });

        const data = await res.json();

        if (!data.ok) {
          showMessage(data.message || "Delete failed", "error");
          return;
        }

        showMessage("Bet #" + betId + " deleted", "success");
        loadBets();
      }

      async function loadBets() {
        const res = await fetch("/bets?format=json", {
          credentials: "include",
          cache: "no-store"
        });

        const data = await res.json();

        if (!data.ok) {
          document.getElementById("betsBox").innerHTML = "<p>Error loading bets</p>";
          return;
        }

        const bets = data.bets || [];

        if (!bets.length) {
          document.getElementById("betsBox").innerHTML = "<p>No bets yet.</p>";
          return;
        }

        const pending = bets.filter(b => normalizeStatus(b.status) === "pending").length;
        const wins = bets.filter(b => normalizeStatus(b.status) === "win").length;
        const loses = bets.filter(b => normalizeStatus(b.status) === "lose").length;

        document.getElementById("betsBox").innerHTML = \`
          <h2 style="margin-bottom:16px;">Bets overview</h2>

          <div class="stats" style="margin-bottom:22px;">
            <div class="stat"><div class="label">Total bets</div><div class="value">\${bets.length}</div></div>
            <div class="stat"><div class="label">Pending</div><div class="value">\${pending}</div></div>
            <div class="stat win-stat"><div class="label">Wins</div><div class="value">\${wins}</div></div>
            <div class="stat lose-stat"><div class="label">Loses</div><div class="value">\${loses}</div></div>
          </div>

          <h2 style="margin-bottom:16px;">All bets</h2>

          \${bets.map(bet => {
            const s = normalizeStatus(bet.status);
            return \`
              <div class="bet-row bet \${cardClass(s)}">
                <div class="bet-title">\${bet.match_name}</div>
                <div class="bet-meta">Selection: \${bet.selection}</div>
                <div><strong>ID:</strong> \${bet.id}</div>
                <div><strong>User:</strong> \${bet.email || bet.user_id}</div>
                <div><strong>Odds:</strong> \${bet.odds}</div>
                <div><strong>Stake:</strong> \${bet.stake}</div>
                <div><strong>Possible win:</strong> \${bet.possible_win}</div>
                <div style="margin-top:10px;">\${statusBadge(s)}</div>
                <div class="action-row">
                  \${s === "pending" ? \`
                    <button class="btn-green" onclick="settleBet(\${bet.id}, 'win')">WIN</button>
                    <button class="btn-red" onclick="settleBet(\${bet.id}, 'lose')">LOSE</button>
                  \` : ""}
                  <button class="btn-orange" onclick="deleteBet(\${bet.id})">DELETE</button>
                </div>
              </div>
            \`;
          }).join("")}
        \`;
      }

      loadBets();
    </script>
  `);

  res.send(html);
});

app.get("/users", async (req, res) => {
  const user = await getUser(req);

  if (!user) {
    const html = await renderLayout(req, "Users", loginRequiredInner("Users"));
    return res.send(html);
  }

  if (!isAdmin(user)) {
    const html = await renderLayout(req, "Users", accessDeniedInner());
    return res.send(html);
  }

  try {
    const result = await pool.query(
      "SELECT id, email, balance, created_at FROM users ORDER BY id DESC"
    );

    if (req.query.format === "json") {
      return res.json({ ok: true, users: result.rows });
    }

    const html = await renderLayout(req, "Users", `
      <div class="card">
        <h1>Users</h1>
        <p class="muted">List of all registered users.</p>
      </div>
      <div class="card">
        ${result.rows.length === 0 ? "<p>No users yet.</p>" : result.rows.map(row => `
          <div class="user-row">
            <div><strong>ID:</strong> ${row.id}</div>
            <div><strong>Email:</strong> ${row.email}</div>
            <div><strong>Balance:</strong> ${row.balance}</div>
            <div><strong>Created:</strong> ${row.created_at}</div>
          </div>
        `).join("")}
      </div>
    `);

    res.send(html);
  } catch (err) {
    if (req.query.format === "json") {
      return res.json({ ok: false, message: err.message });
    }

    res.send(await renderLayout(req, "Users", `
      <div class="card">
        <h1>Users</h1>
        <div class="message error" style="display:block;">${err.message}</div>
      </div>
    `));
  }
});

app.get("/bets", async (req, res) => {
  const user = await getUser(req);

  if (req.query.format !== "json") {
    if (!user) {
      const html = await renderLayout(req, "Bets", loginRequiredInner("Bets"));
      return res.send(html);
    }

    if (!isAdmin(user)) {
      const html = await renderLayout(req, "Bets", accessDeniedInner());
      return res.send(html);
    }
  }

  try {
    const result = await pool.query(`
      SELECT bets.*, users.email
      FROM bets
      LEFT JOIN users ON users.id = bets.user_id
      ORDER BY bets.id DESC
    `);

    if (req.query.format === "json") {
      if (!user || !isAdmin(user)) {
        return res.json({ ok: false, message: "Admin access required" });
      }
      return res.json({ ok: true, bets: result.rows });
    }

    const html = await renderLayout(req, "Bets", `
      <div class="card">
        <h1>Bets</h1>
        <p class="muted">List of all bets in the system.</p>
      </div>

      <div class="card">
        ${result.rows.length === 0 ? "<p>No bets yet.</p>" : result.rows.map(bet => {
          const s = normalizeStatus(bet.status);
          return `
            <div class="bet-row bet ${s}-box">
              <div class="bet-title">${bet.match_name}</div>
              <div class="bet-meta">Selection: ${bet.selection}</div>
              <div><strong>ID:</strong> ${bet.id}</div>
              <div><strong>User:</strong> ${bet.email || bet.user_id}</div>
              <div><strong>Odds:</strong> ${bet.odds}</div>
              <div><strong>Stake:</strong> ${bet.stake}</div>
              <div><strong>Possible win:</strong> ${bet.possible_win}</div>
              <div><span class="status ${s}">${s}</span></div>
            </div>
          `;
        }).join("")}
      </div>
    `);

    res.send(html);
  } catch (err) {
    if (req.query.format === "json") {
      return res.json({ ok: false, message: err.message });
    }

    res.send(await renderLayout(req, "Bets", `
      <div class="card">
        <h1>Bets</h1>
        <div class="message error" style="display:block;">${err.message}</div>
      </div>
    `));
  }
});

app.get("/test-register", (req, res) => res.redirect("/register"));
app.get("/test-login", (req, res) => res.redirect("/login"));
app.get("/test-bet", (req, res) => res.redirect("/matches"));
app.get("/test-settle", (req, res) => res.redirect("/admin"));

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log("Server started on port", port);
});
