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

app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      sameSite: "lax"
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
  return String(status || "pending").trim().toLowerCase();
}

function getLevelInfo(xp) {
  const safeXp = Number(xp || 0);
  const level = Math.floor(safeXp / 100) + 1;
  const currentLevelXp = safeXp % 100;
  const nextLevelXp = 100;
  const percent = Math.min(100, Math.max(0, (currentLevelXp / nextLevelXp) * 100));

  return {
    xp: safeXp,
    level,
    currentLevelXp,
    nextLevelXp,
    percent
  };
}

async function getUser(req) {
  if (!req.session.userId) return null;

  const result = await pool.query(
    "SELECT * FROM users WHERE id = $1 LIMIT 1",
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

function page(title, content) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <title>${title}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <style>
      * { box-sizing: border-box; }

      :root {
        --bg1: #0b1020;
        --bg2: #111827;
        --card: #121a2f;
        --card2: #18233f;
        --text: #f3f7ff;
        --muted: #94a3b8;
        --blue: #3b82f6;
        --violet: #8b5cf6;
        --green: #22c55e;
        --red: #ef4444;
        --amber: #f59e0b;
        --line: #26324d;
      }

      body {
        margin: 0;
        font-family: Arial, sans-serif;
        color: var(--text);
        background:
          radial-gradient(circle at top left, #18203a 0%, transparent 25%),
          radial-gradient(circle at top right, #24153f 0%, transparent 22%),
          linear-gradient(135deg, var(--bg1), var(--bg2));
        min-height: 100vh;
      }

      .container {
        max-width: 1180px;
        margin: auto;
        padding: 16px;
      }

      .topbar {
        background: rgba(18, 26, 47, 0.95);
        border: 1px solid var(--line);
        border-radius: 22px;
        padding: 18px;
        margin-bottom: 16px;
        box-shadow: 0 0 20px rgba(0,0,0,0.35);
      }

      .top-row {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        align-items: center;
      }

      .pill {
        display: inline-block;
        padding: 10px 14px;
        border-radius: 999px;
        font-weight: bold;
        font-size: 14px;
        background: #1e293b;
        border: 1px solid #334155;
        color: #e2e8f0;
      }

      .pill.blue {
        background: rgba(59,130,246,0.15);
        border-color: rgba(59,130,246,0.4);
        color: #93c5fd;
      }

      .pill.violet {
        background: rgba(139,92,246,0.14);
        border-color: rgba(139,92,246,0.4);
        color: #c4b5fd;
      }

      .pill.green {
        background: rgba(34,197,94,0.14);
        border-color: rgba(34,197,94,0.35);
        color: #86efac;
      }

      .nav {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-bottom: 18px;
      }

      .nav a {
        text-decoration: none;
        color: #cbd5e1;
        background: rgba(24, 35, 63, 0.95);
        border: 1px solid var(--line);
        padding: 11px 15px;
        border-radius: 14px;
        font-weight: bold;
      }

      .nav a:hover {
        color: white;
        border-color: #3b82f6;
        box-shadow: 0 0 12px rgba(59,130,246,0.25);
      }

      .hero {
        background:
          radial-gradient(circle at right top, rgba(139,92,246,0.35), transparent 24%),
          linear-gradient(135deg, #1d4ed8, #8b5cf6);
        border-radius: 24px;
        padding: 28px;
        margin-bottom: 18px;
        box-shadow: 0 0 25px rgba(59,130,246,0.22);
      }

      .hero h1 {
        margin: 0 0 10px;
        font-size: 40px;
      }

      .hero p {
        margin: 0;
        color: rgba(255,255,255,0.92);
        line-height: 1.6;
        font-size: 18px;
      }

      .card {
        background: linear-gradient(180deg, var(--card), var(--card2));
        border: 1px solid var(--line);
        border-radius: 20px;
        padding: 20px;
        margin-bottom: 16px;
        box-shadow: 0 0 20px rgba(0,0,0,0.35);
      }

      h1, h2, h3 {
        margin-top: 0;
      }

      .muted {
        color: var(--muted);
        line-height: 1.65;
      }

      input, button {
        width: 100%;
        padding: 13px 14px;
        border-radius: 14px;
        margin-top: 8px;
        font-size: 16px;
      }

      input {
        border: 1px solid #334155;
        background: #0f172a;
        color: white;
      }

      button {
        border: none;
        color: white;
        font-weight: bold;
        cursor: pointer;
        background: linear-gradient(180deg, #3b82f6, #2563eb);
        box-shadow: 0 0 12px rgba(59,130,246,0.3);
      }

      button:hover {
        filter: brightness(1.05);
      }

      .btn-green {
        background: linear-gradient(180deg, #22c55e, #16a34a);
        box-shadow: 0 0 12px rgba(34,197,94,0.25);
      }

      .btn-red {
        background: linear-gradient(180deg, #ef4444, #dc2626);
        box-shadow: 0 0 12px rgba(239,68,68,0.25);
      }

      .btn-violet {
        background: linear-gradient(180deg, #8b5cf6, #7c3aed);
        box-shadow: 0 0 12px rgba(139,92,246,0.25);
      }

      .btn-gray {
        background: linear-gradient(180deg, #475569, #334155);
        box-shadow: none;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 14px;
      }

      .two-cols {
        display: grid;
        grid-template-columns: 1.45fr 1fr;
        gap: 16px;
      }

      .stat {
        background: rgba(15, 23, 42, 0.72);
        border: 1px solid #273449;
        border-radius: 18px;
        padding: 16px;
      }

      .stat-label {
        color: var(--muted);
        margin-bottom: 10px;
        font-size: 14px;
      }

      .stat-value {
        font-size: 28px;
        font-weight: 800;
      }

      .match {
        padding: 18px;
        border-radius: 18px;
        background: rgba(15, 23, 42, 0.72);
        border: 1px solid #26324d;
        margin-bottom: 14px;
      }

      .league {
        display: inline-block;
        padding: 6px 10px;
        border-radius: 999px;
        background: rgba(139,92,246,0.15);
        border: 1px solid rgba(139,92,246,0.35);
        color: #c4b5fd;
        font-size: 12px;
        font-weight: bold;
        margin-bottom: 10px;
      }

      .teams {
        font-size: 24px;
        font-weight: 800;
        margin-bottom: 8px;
      }

      .odds {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 10px;
        margin-top: 14px;
      }

      .odds button {
        min-height: 78px;
      }

      .slip-box {
        position: sticky;
        top: 16px;
      }

      .slip-empty {
        border: 2px dashed #334155;
        border-radius: 18px;
        padding: 18px;
        text-align: center;
        color: var(--muted);
        background: rgba(15, 23, 42, 0.4);
      }

      .slip-selected {
        background: rgba(15, 23, 42, 0.72);
        border: 1px solid #273449;
        border-radius: 18px;
        padding: 16px;
        margin-bottom: 12px;
      }

      .slip-small {
        color: var(--muted);
        font-size: 14px;
        margin-bottom: 8px;
      }

      .slip-big {
        font-size: 24px;
        font-weight: 800;
        margin-bottom: 6px;
      }

      .slip-win {
        border-radius: 18px;
        padding: 16px;
        background: rgba(59,130,246,0.12);
        border: 1px solid rgba(59,130,246,0.32);
        margin: 12px 0;
      }

      .slip-win-label {
        color: #93c5fd;
        margin-bottom: 8px;
      }

      .slip-win-value {
        font-size: 40px;
        font-weight: 900;
        color: #bfdbfe;
      }

      .bet-row, .history-row, .user-row, .leader-row {
        padding: 16px;
        border-radius: 18px;
        background: rgba(15, 23, 42, 0.72);
        border: 1px solid #273449;
        margin-bottom: 12px;
      }

      .bet-title {
        font-size: 22px;
        font-weight: 800;
        margin-bottom: 6px;
      }

      .bet-meta {
        color: var(--muted);
        margin-bottom: 10px;
      }

      .status {
        display: inline-block;
        padding: 7px 11px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: bold;
        margin-top: 10px;
        text-transform: uppercase;
      }

      .status.pending {
        background: rgba(245,158,11,0.18);
        color: #fbbf24;
        border: 1px solid rgba(245,158,11,0.35);
      }

      .status.win {
        background: rgba(34,197,94,0.18);
        color: #86efac;
        border: 1px solid rgba(34,197,94,0.35);
      }

      .status.lose {
        background: rgba(239,68,68,0.18);
        color: #fca5a5;
        border: 1px solid rgba(239,68,68,0.35);
      }

      .message {
        display: none;
        margin-top: 12px;
        padding: 12px 14px;
        border-radius: 14px;
        font-weight: bold;
      }

      .message.success {
        display: block;
        background: rgba(34,197,94,0.16);
        color: #86efac;
        border: 1px solid rgba(34,197,94,0.35);
      }

      .message.error {
        display: block;
        background: rgba(239,68,68,0.16);
        color: #fca5a5;
        border: 1px solid rgba(239,68,68,0.35);
      }

      .xp-bar-wrap {
        width: 100%;
        height: 14px;
        border-radius: 999px;
        background: #0f172a;
        border: 1px solid #25324a;
        overflow: hidden;
        margin-top: 10px;
      }

      .xp-bar {
        height: 100%;
        background: linear-gradient(90deg, #3b82f6, #8b5cf6);
        box-shadow: 0 0 14px rgba(139,92,246,0.35);
      }

      .small-note {
        color: var(--muted);
        font-size: 13px;
        margin-top: 8px;
      }

      .right-buttons {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin-top: 12px;
      }

      .right-buttons button {
        width: auto;
        min-width: 120px;
        margin: 0;
      }

      .leader-row {
        display: grid;
        grid-template-columns: 70px 1.5fr 120px 120px 140px;
        gap: 12px;
        align-items: center;
      }

      .leader-rank {
        font-size: 26px;
        font-weight: 900;
      }

      .leader-name {
        font-size: 18px;
        font-weight: 700;
      }

      .leader-sub {
        color: var(--muted);
        font-size: 13px;
        margin-top: 4px;
      }

      .leader-stat {
        text-align: center;
      }

      .leader-stat-label {
        color: var(--muted);
        font-size: 12px;
        margin-bottom: 6px;
      }

      .leader-stat-value {
        font-size: 20px;
        font-weight: 800;
      }

      @media (max-width: 900px) {
        .two-cols {
          grid-template-columns: 1fr;
        }

        .odds {
          grid-template-columns: 1fr;
        }

        .slip-box {
          position: static;
        }

        .hero h1 {
          font-size: 30px;
        }

        .hero p {
          font-size: 16px;
        }

        .leader-row {
          grid-template-columns: 1fr;
          text-align: left;
        }

        .leader-stat {
          text-align: left;
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
  const levelInfo = user ? getLevelInfo(user.xp) : null;

  return page(title, `
    <div class="topbar">
      <div class="top-row">
        <div class="pill">🎮 Demo Arena</div>
        <div class="pill ${user ? "blue" : ""}">${user ? "Logged in" : "Guest"}</div>
        ${user ? `<div class="pill">${user.email}</div>` : ""}
        ${user ? `<div class="pill green">Balance: ${user.balance}</div>` : ""}
        ${user ? `<div class="pill violet">Level ${levelInfo.level}</div>` : ""}
        ${admin ? `<div class="pill violet">Admin</div>` : ""}
      </div>
    </div>

    <div class="nav">
      <a href="/">Home</a>
      <a href="/register">Register</a>
      <a href="/login">Login</a>
      <a href="/matches">Matches</a>
      <a href="/dashboard">Dashboard</a>
      <a href="/leaderboard">Leaderboard</a>
      <a href="/balance-history">Balance History</a>
      ${admin ? `<a href="/admin">Admin</a>` : ""}
      ${admin ? `<a href="/users">Users</a>` : ""}
      ${admin ? `<a href="/bets">Bets</a>` : ""}
    </div>

    ${innerHtml}
  `);
}

function loginRequiredInner(title) {
  return `
    <div class="card">
      <h1>${title}</h1>
      <p class="muted">Please login first to access this page.</p>
      <button onclick="location.href='/login'">Go to login</button>
    </div>
  `;
}

function accessDeniedInner() {
  return `
    <div class="card">
      <h1>Access denied</h1>
      <div class="muted">This page is available only for admin user: <b>${ADMIN_EMAIL}</b></div>
    </div>
  `;
}

app.get("/", async (req, res) => {
  const html = await renderLayout(req, "Home", `
    <div class="hero">
      <h1>Night Arena</h1>
      <p>Dark game-style betting simulator with virtual balance, XP, levels, leaderboard and admin settlement. No real money.</p>
    </div>

    <div class="grid">
      <div class="card">
        <h3>🎯 Prediction gameplay</h3>
        <p class="muted">Pick match outcomes, place demo bets, and improve your player profile.</p>
      </div>

      <div class="card">
        <h3>⚡ Level system</h3>
        <p class="muted">Gain XP for betting and winning. Grow your level and track your progress.</p>
      </div>

      <div class="card">
        <h3>🏆 Leaderboard</h3>
        <p class="muted">Compete with other players and climb the XP ranking.</p>
      </div>
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
        xp INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS xp INT DEFAULT 0
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
      "INSERT INTO users (email, password, xp) VALUES ($1, $2, 0) RETURNING *",
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
    res.json({ ok: true });
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

    const levelInfo = getLevelInfo(user.xp);

    res.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        balance: user.balance,
        xp: user.xp,
        level: levelInfo.level,
        level_progress_percent: levelInfo.percent,
        level_current_xp: levelInfo.currentLevelXp,
        level_next_xp: levelInfo.nextLevelXp
      }
    });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
});

app.get("/register", async (req, res) => {
  const html = await renderLayout(req, "Register", `
    <div class="card">
      <h1>Create account</h1>
      <p class="muted">Create your player profile and start with a virtual balance.</p>
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
      <p class="muted">Enter your player account to continue.</p>
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
    const xpGain = 10;

    await pool.query(
      "UPDATE users SET balance = balance - $1, xp = COALESCE(xp, 0) + $2 WHERE id = $3",
      [stake, xpGain, user.id]
    );

    const betResult = await pool.query(
      `INSERT INTO bets (user_id, match_name, selection, odds, stake, possible_win)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [user.id, match_name, selection, odds, stake, possibleWin]
    );

    const updatedUser = await pool.query(
      "SELECT * FROM users WHERE id = $1",
      [user.id]
    );

    const updated = updatedUser.rows[0];
    const levelInfo = getLevelInfo(updated.xp);

    await pool.query(
      `INSERT INTO balance_history (user_id, amount, type, description, bet_id, balance_after)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        user.id,
        -Math.abs(Number(stake)),
        "bet_stake",
        `Stake for ${match_name} / ${selection}`,
        betResult.rows[0].id,
        newBalance
      ]
    );

    res.json({
      ok: true,
      bet: betResult.rows[0],
      newBalance,
      xpGain,
      xp: updated.xp,
      level: levelInfo.level
    });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
});

app.post("/settle-bet", async (req, res) => {
  try {
    const admin = await getUser(req);

    if (!isAdmin(admin)) {
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
    let xpGain = 0;

    if (status === "win") {
      xpGain = 25;

      await pool.query(
        "UPDATE users SET balance = balance + $1, xp = COALESCE(xp, 0) + $2 WHERE id = $3",
        [bet.possible_win, xpGain, bet.user_id]
      );

      const userResult = await pool.query(
        "SELECT * FROM users WHERE id = $1",
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
      xpGain = 5;

      await pool.query(
        "UPDATE users SET xp = COALESCE(xp, 0) + $1 WHERE id = $2",
        [xpGain, bet.user_id]
      );

      const userResult = await pool.query(
        "SELECT * FROM users WHERE id = $1",
        [bet.user_id]
      );

      newBalance = Number(userResult.rows[0].balance);
    }

    const finalUser = await pool.query(
      "SELECT * FROM users WHERE id = $1",
      [bet.user_id]
    );

    const levelInfo = getLevelInfo(finalUser.rows[0].xp);

    res.json({
      ok: true,
      message: "Bet settled",
      newBalance,
      xpGain,
      level: levelInfo.level,
      xp: finalUser.rows[0].xp
    });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
});

app.post("/delete-bet", async (req, res) => {
  try {
    const admin = await getUser(req);

    if (!isAdmin(admin)) {
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

app.get("/api/leaderboard", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, email, balance, xp, created_at FROM users ORDER BY xp DESC, balance DESC, id ASC LIMIT 50"
    );

    const players = result.rows.map((row, index) => ({
      rank: index + 1,
      id: row.id,
      email: row.email,
      balance: row.balance,
      xp: row.xp || 0,
      level: getLevelInfo(row.xp).level,
      created_at: row.created_at
    }));

    res.json({ ok: true, players });
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
      <p class="muted">Choose a market, set your stake, and gain XP for every action.</p>
    </div>

    <div class="two-cols">
      <div class="card">
        <h2>Available matches</h2>

        ${demoMatches.map(match => `
          <div class="match">
            <div class="league">${match.league}</div>
            <div class="teams">${match.team1} vs ${match.team2}</div>
            <div class="muted">Select your outcome below.</div>

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

      <div class="slip-box">
        <div class="card">
          <h2>Bet Slip</h2>

          <div class="stat" style="margin-bottom:14px;">
            <div class="stat-label">Current balance</div>
            <div class="stat-value" id="balanceBox">${user.balance}</div>
          </div>

          <div id="emptySlip" class="slip-empty">
            Pick any outcome to prepare your bet.
          </div>

          <div id="slipContent" style="display:none;">
            <div class="slip-selected">
              <div class="slip-small">Selected outcome</div>
              <div class="slip-big" id="slipMatch"></div>
              <div class="muted" id="slipSelection" style="margin-bottom:10px;"></div>
              <div><strong>Odds:</strong> <span id="slipOdds"></span></div>
            </div>

            <input id="slipStake" placeholder="Stake" oninput="updateWin()" />

            <div class="slip-win">
              <div class="slip-win-label">Potential return</div>
              <div class="slip-win-value" id="possibleWin">0</div>
            </div>

            <div class="small-note">You gain <b>+10 XP</b> for every placed bet.</div>

            <button class="btn-violet" onclick="placeBet()">Place Bet</button>
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
        showMessage("Bet placed successfully. +" + data.xpGain + " XP", "success");
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
      <h1>Player Dashboard</h1>
      <p class="muted">Track your level, XP, balance and demo betting performance.</p>
      <div class="right-buttons">
        <button onclick="loadDashboard()">Refresh Dashboard</button>
        <button class="btn-gray" onclick="logoutNow()">Logout</button>
      </div>
      <div id="dashMsg" class="message"></div>
    </div>

    <div id="dashboardContent" class="card">Loading...</div>

    <script>
      async function logoutNow() {
        await fetch("/logout", {
          method: "POST",
          credentials: "include"
        });
        location.href = "/login";
      }

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
            location.href = "/login";
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
            throw new Error(historyData.message || "Could not load history");
          }

          const bets = betsData.bets || [];
          const history = historyData.history || [];

          const pending = bets.filter(b => normalizeStatus(b.status) === "pending").length;
          const wins = bets.filter(b => normalizeStatus(b.status) === "win").length;
          const loses = bets.filter(b => normalizeStatus(b.status) === "lose").length;

          const totalStaked = bets.reduce((sum, b) => sum + Number(b.stake || 0), 0);
          const totalWon = history
            .filter(h => h.type === "bet_win")
            .reduce((sum, h) => sum + Number(h.amount || 0), 0);
          const totalRefund = history
            .filter(h => h.type === "bet_refund")
            .reduce((sum, h) => sum + Number(h.amount || 0), 0);
          const profit = totalWon + totalRefund - totalStaked;

          document.getElementById("dashboardContent").innerHTML = \`
            <h2>Player Profile</h2>

            <div class="stats" style="margin-bottom:16px;">
              <div class="stat">
                <div class="stat-label">Email</div>
                <div class="stat-value" style="font-size:18px;">\${meData.user.email}</div>
              </div>
              <div class="stat">
                <div class="stat-label">Balance</div>
                <div class="stat-value">\${meData.user.balance}</div>
              </div>
              <div class="stat">
                <div class="stat-label">Level</div>
                <div class="stat-value">\${meData.user.level}</div>
              </div>
              <div class="stat">
                <div class="stat-label">Total XP</div>
                <div class="stat-value">\${meData.user.xp}</div>
              </div>
            </div>

            <div class="card" style="padding:16px; margin-bottom:16px;">
              <div style="font-size:18px; font-weight:800; margin-bottom:4px;">XP Progress</div>
              <div class="muted">\${meData.user.level_current_xp} / \${meData.user.level_next_xp} XP to next level</div>
              <div class="xp-bar-wrap">
                <div class="xp-bar" style="width:\${meData.user.level_progress_percent}%"></div>
              </div>
            </div>

            <h2>Stats</h2>
            <div class="stats">
              <div class="stat">
                <div class="stat-label">Total bets</div>
                <div class="stat-value">\${bets.length}</div>
              </div>
              <div class="stat">
                <div class="stat-label">Pending</div>
                <div class="stat-value">\${pending}</div>
              </div>
              <div class="stat">
                <div class="stat-label">Wins</div>
                <div class="stat-value">\${wins}</div>
              </div>
              <div class="stat">
                <div class="stat-label">Loses</div>
                <div class="stat-value">\${loses}</div>
              </div>
              <div class="stat">
                <div class="stat-label">Total staked</div>
                <div class="stat-value">\${totalStaked}</div>
              </div>
              <div class="stat">
                <div class="stat-label">Profit</div>
                <div class="stat-value">\${profit}</div>
              </div>
            </div>

            <h2 style="margin-top:22px;">My Bets</h2>
            \${bets.length === 0 ? "<p class='muted'>No bets yet.</p>" : bets.map(b => {
              const s = normalizeStatus(b.status);
              return \`
                <div class="bet-row">
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
          document.getElementById("dashboardContent").innerHTML = "<p class='muted'>Could not load dashboard.</p>";
        }
      }

      loadDashboard();
    </script>
  `);

  res.send(html);
});

app.get("/leaderboard", async (req, res) => {
  const html = await renderLayout(req, "Leaderboard", `
    <div class="card">
      <h1>Leaderboard</h1>
      <p class="muted">Top players by XP, level and balance.</p>
      <button onclick="loadLeaderboard()">Refresh Leaderboard</button>
    </div>

    <div id="leaderboardContent" class="card">Loading...</div>

    <script>
      function medal(rank) {
        if (rank === 1) return "🥇";
        if (rank === 2) return "🥈";
        if (rank === 3) return "🥉";
        return "#" + rank;
      }

      async function loadLeaderboard() {
        const res = await fetch("/api/leaderboard", {
          credentials: "include",
          cache: "no-store"
        });

        const data = await res.json();

        if (!data.ok) {
          document.getElementById("leaderboardContent").innerHTML = "<p class='muted'>Could not load leaderboard.</p>";
          return;
        }

        const players = data.players || [];

        document.getElementById("leaderboardContent").innerHTML = \`
          <h2>Top Players</h2>
          \${players.length === 0 ? "<p class='muted'>No players yet.</p>" : players.map(player => \`
            <div class="leader-row">
              <div class="leader-rank">\${medal(player.rank)}</div>

              <div>
                <div class="leader-name">\${player.email}</div>
                <div class="leader-sub">Player ID: \${player.id}</div>
              </div>

              <div class="leader-stat">
                <div class="leader-stat-label">Level</div>
                <div class="leader-stat-value">\${player.level}</div>
              </div>

              <div class="leader-stat">
                <div class="leader-stat-label">XP</div>
                <div class="leader-stat-value">\${player.xp}</div>
              </div>

              <div class="leader-stat">
                <div class="leader-stat-label">Balance</div>
                <div class="leader-stat-value">\${player.balance}</div>
              </div>
            </div>
          \`).join("")}
        \`;
      }

      loadLeaderboard();
    </script>
  `);

  res.send(html);
});

app.get("/balance-history", async (req, res) => {
  const user = await getUser(req);
  if (!user) {
    const html = await renderLayout(req, "Balance History", loginRequiredInner("Balance History"));
    return res.send(html);
  }

  const html = await renderLayout(req, "Balance History", `
    <div class="card">
      <h1>Balance History</h1>
      <p class="muted">All balance movements: stakes, refunds and win payouts.</p>
      <button onclick="loadHistory()">Refresh History</button>
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
          document.getElementById("historyContent").innerHTML = "<p class='muted'>Could not load history.</p>";
          return;
        }

        const rows = data.history || [];

        document.getElementById("historyContent").innerHTML = \`
          <h2>Entries</h2>
          \${rows.length === 0 ? "<p class='muted'>No balance changes yet.</p>" : rows.map(r => \`
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
      <h1>Admin Panel</h1>
      <p class="muted">Settle bets and manage demo actions.</p>
      <button onclick="loadBets()">Refresh Bets</button>
      <div id="msg" class="message"></div>
    </div>

    <div id="betsBox" class="card">Loading...</div>

    <script>
      function showMessage(text, type) {
        const box = document.getElementById("msg");
        box.className = "message " + type;
        box.style.display = "block";
        box.textContent = text;
      }

      function normalizeStatus(status) {
        return String(status || "").trim().toLowerCase();
      }

      function statusBadge(status) {
        const s = normalizeStatus(status);
        return '<span class="status ' + s + '">' + s + '</span>';
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

        showMessage("Bet #" + betId + " settled. +" + data.xpGain + " XP to player", "success");
        loadBets();
      }

      async function deleteBet(betId) {
        const ok = confirm("Delete bet #" + betId + "?");
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
          document.getElementById("betsBox").innerHTML = "<p class='muted'>Error loading bets</p>";
          return;
        }

        const bets = data.bets || [];

        document.getElementById("betsBox").innerHTML = \`
          <h2>All Bets</h2>
          \${bets.length === 0 ? "<p class='muted'>No bets yet.</p>" : bets.map(bet => {
            const s = normalizeStatus(bet.status);
            return \`
              <div class="bet-row">
                <div class="bet-title">\${bet.match_name}</div>
                <div class="bet-meta">Selection: \${bet.selection}</div>
                <div><strong>ID:</strong> \${bet.id}</div>
                <div><strong>User:</strong> \${bet.email || bet.user_id}</div>
                <div><strong>Odds:</strong> \${bet.odds}</div>
                <div><strong>Stake:</strong> \${bet.stake}</div>
                <div><strong>Possible win:</strong> \${bet.possible_win}</div>
                <div>\${statusBadge(s)}</div>
                <div class="right-buttons">
                  \${s === "pending" ? \`
                    <button class="btn-green" onclick="settleBet(\${bet.id}, 'win')">WIN</button>
                    <button class="btn-red" onclick="settleBet(\${bet.id}, 'lose')">LOSE</button>
                  \` : ""}
                  <button class="btn-violet" onclick="deleteBet(\${bet.id})">DELETE</button>
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
      "SELECT id, email, balance, xp, created_at FROM users ORDER BY id DESC"
    );

    if (req.query.format === "json") {
      return res.json({ ok: true, users: result.rows });
    }

    const html = await renderLayout(req, "Users", `
      <div class="card">
        <h1>Users</h1>
        <p class="muted">Player list with balance and XP.</p>
      </div>

      <div class="card">
        ${result.rows.length === 0 ? "<p class='muted'>No users yet.</p>" : result.rows.map(row => {
          const levelInfo = getLevelInfo(row.xp);
          return `
            <div class="user-row">
              <div><strong>ID:</strong> ${row.id}</div>
              <div><strong>Email:</strong> ${row.email}</div>
              <div><strong>Balance:</strong> ${row.balance}</div>
              <div><strong>XP:</strong> ${row.xp || 0}</div>
              <div><strong>Level:</strong> ${levelInfo.level}</div>
              <div><strong>Created:</strong> ${row.created_at}</div>
            </div>
          `;
        }).join("")}
      </div>
    `);

    res.send(html);
  } catch (err) {
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
        <p class="muted">All bets in the system.</p>
      </div>

      <div class="card">
        ${result.rows.length === 0 ? "<p class='muted'>No bets yet.</p>" : result.rows.map(bet => {
          const s = normalizeStatus(bet.status);
          return `
            <div class="bet-row">
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
app.listen(port, () => console.log("Running on port", port));
