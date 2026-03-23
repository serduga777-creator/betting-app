require("dotenv").config();

const express = require("express");
const cors = require("cors");
const session = require("express-session");
const pool = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "super-secret-demo-key",
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

async function getLoggedInUser(req) {
  if (!req.session.userId) {
    return null;
  }

  const result = await pool.query(
    "SELECT * FROM users WHERE id = $1 LIMIT 1",
    [req.session.userId]
  );

  if (result.rows.length === 0) {
    req.session.userId = null;
    return null;
  }

  return result.rows[0];
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

          body {
            margin: 0;
            font-family: Arial, sans-serif;
            background: #f5f7fb;
            color: #111827;
          }

          .container {
            max-width: 1150px;
            margin: 0 auto;
            padding: 24px;
          }

          .topbar {
            background: white;
            border-radius: 18px;
            padding: 14px 16px;
            box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
            margin-bottom: 16px;
            display: flex;
            justify-content: space-between;
            gap: 12px;
            align-items: center;
            flex-wrap: wrap;
          }

          .topbar-left {
            display: flex;
            gap: 12px;
            align-items: center;
            flex-wrap: wrap;
          }

          .topbar-pill {
            background: #eff6ff;
            color: #1d4ed8;
            padding: 8px 12px;
            border-radius: 999px;
            font-size: 14px;
            font-weight: bold;
          }

          .topbar-pill.gray {
            background: #f1f5f9;
            color: #334155;
          }

          .topbar-right {
            display: flex;
            gap: 10px;
            align-items: center;
            flex-wrap: wrap;
          }

          .small-btn {
            background: #2563eb;
            color: white;
            border: none;
            border-radius: 10px;
            padding: 10px 14px;
            font-weight: bold;
            cursor: pointer;
          }

          .small-btn.gray {
            background: #475569;
          }

          .nav {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-bottom: 24px;
          }

          .nav a {
            text-decoration: none;
            color: #1d4ed8;
            background: #eff6ff;
            padding: 10px 14px;
            border-radius: 10px;
            font-weight: bold;
          }

          .hero {
            background: linear-gradient(135deg, #0f172a, #1d4ed8);
            color: white;
            border-radius: 24px;
            padding: 40px 28px;
            margin-bottom: 24px;
            box-shadow: 0 15px 35px rgba(15, 23, 42, 0.18);
          }

          .badge {
            display: inline-block;
            background: rgba(255,255,255,0.16);
            padding: 8px 12px;
            border-radius: 999px;
            font-size: 14px;
            margin-bottom: 18px;
          }

          h1 {
            margin: 0 0 14px 0;
            font-size: 38px;
            line-height: 1.1;
          }

          h2 {
            margin-top: 0;
          }

          .subtitle {
            font-size: 18px;
            line-height: 1.6;
            max-width: 720px;
            opacity: 0.95;
          }

          .buttons {
            margin-top: 24px;
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
          }

          .btn {
            text-decoration: none;
            padding: 14px 18px;
            border-radius: 12px;
            font-weight: bold;
            display: inline-block;
            cursor: pointer;
            border: none;
          }

          .btn-primary {
            background: white;
            color: #1d4ed8;
          }

          .btn-secondary {
            background: rgba(255,255,255,0.14);
            color: white;
            border: 1px solid rgba(255,255,255,0.22);
          }

          .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
          }

          .card {
            background: white;
            border-radius: 18px;
            padding: 22px;
            box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
          }

          .card h3 {
            margin: 0 0 10px 0;
            font-size: 20px;
          }

          .card p {
            margin: 0;
            line-height: 1.6;
            color: #475569;
          }

          .section {
            background: white;
            border-radius: 18px;
            padding: 24px;
            box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
            margin-bottom: 24px;
          }

          .box {
            max-width: 520px;
            background: white;
            padding: 24px;
            border-radius: 18px;
            box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
          }

          .muted {
            color: #64748b;
          }

          input, select, button {
            width: 100%;
            margin: 8px 0;
            padding: 14px;
            border-radius: 10px;
            border: 1px solid #dbe2ea;
            font-size: 16px;
          }

          button {
            background: #2563eb;
            color: white;
            font-weight: bold;
            border: none;
            cursor: pointer;
          }

          .button-row {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
          }

          .button-row button,
          .button-row a {
            width: auto;
            min-width: 110px;
          }

          .win-btn { background: #16a34a; }
          .lose-btn { background: #dc2626; }
          .logout-btn { background: #475569; }

          .status-badge {
            display: inline-block;
            padding: 6px 10px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
          }

          .status-pending { background: #fef3c7; color: #92400e; }
          .status-win { background: #dcfce7; color: #166534; }
          .status-lose { background: #fee2e2; color: #991b1b; }

          .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 16px;
          }

          .stat {
            background: #eff6ff;
            border-radius: 14px;
            padding: 18px;
          }

          .stat-label {
            font-size: 14px;
            color: #475569;
            margin-bottom: 8px;
          }

          .stat-value {
            font-size: 26px;
            font-weight: bold;
            color: #1d4ed8;
          }

          .bet-row {
            border: 1px solid #e5e7eb;
            border-radius: 14px;
            padding: 16px;
            margin-bottom: 12px;
            background: #fff;
          }

          .history-row {
            border: 1px solid #e5e7eb;
            border-radius: 14px;
            padding: 16px;
            margin-bottom: 12px;
            background: #fff;
          }

          .amount-minus {
            color: #b91c1c;
            font-weight: bold;
          }

          .amount-plus {
            color: #166534;
            font-weight: bold;
          }

          .matches-layout {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 18px;
            align-items: start;
          }

          .match-card {
            background: white;
            border-radius: 18px;
            padding: 22px;
            box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
            margin-bottom: 16px;
          }

          .teams {
            font-size: 22px;
            font-weight: bold;
            margin-bottom: 8px;
          }

          .match-sub {
            color: #64748b;
            margin-bottom: 16px;
          }

          .odds-row {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 10px;
          }

          .odds-btn {
            background: #1d4ed8;
            color: white;
            border: none;
            border-radius: 12px;
            padding: 12px 10px;
            font-weight: bold;
            font-size: 14px;
            line-height: 1.4;
          }

          .odds-btn.secondary {
            background: #0f766e;
          }

          .odds-btn.dark {
            background: #4338ca;
          }

          .betslip {
            position: sticky;
            top: 20px;
            background: white;
            border-radius: 18px;
            padding: 22px;
            box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
          }

          .betslip-title {
            font-size: 22px;
            font-weight: bold;
            margin-bottom: 16px;
          }

          .selected-box {
            background: #eff6ff;
            border-radius: 14px;
            padding: 14px;
            margin-bottom: 14px;
          }

          pre {
            background: #f4f4f4;
            padding: 14px;
            white-space: pre-wrap;
            border-radius: 12px;
            overflow: auto;
          }

          .footer-note {
            font-size: 14px;
            color: #64748b;
            text-align: center;
            padding-bottom: 20px;
          }

          @media (max-width: 900px) {
            .matches-layout {
              grid-template-columns: 1fr;
            }

            .betslip {
              position: static;
            }
          }

          @media (max-width: 640px) {
            .container {
              padding: 16px;
            }

            h1 {
              font-size: 30px;
            }

            .subtitle {
              font-size: 16px;
            }

            .hero {
              padding: 28px 20px;
            }

            .odds-row {
              grid-template-columns: 1fr;
            }

            .topbar {
              align-items: flex-start;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="topbar">
            <div class="topbar-left">
              <div class="topbar-pill gray">MVP demo</div>
              <div id="topbarStatus" class="topbar-pill gray">Guest</div>
              <div id="topbarEmail" class="topbar-pill" style="display:none;"></div>
              <div id="topbarBalance" class="topbar-pill" style="display:none;"></div>
            </div>

            <div class="topbar-right">
              <button id="topbarRefreshBtn" class="small-btn">Refresh user</button>
              <button id="topbarLogoutBtn" class="small-btn gray">Logout</button>
            </div>
          </div>

          <div class="nav">
            <a href="/">Home</a>
            <a href="/register">Register</a>
            <a href="/login">Login</a>
            <a href="/matches">Matches</a>
            <a href="/dashboard">Dashboard</a>
            <a href="/balance-history">Balance history</a>
            <a href="/admin">Admin</a>
            <a href="/users">Users</a>
            <a href="/bets">Bets</a>
          </div>

          ${content}
        </div>

        <script>
          async function refreshTopbarUser() {
            try {
              const res = await fetch("/me");
              const data = await res.json();

              const status = document.getElementById("topbarStatus");
              const email = document.getElementById("topbarEmail");
              const balance = document.getElementById("topbarBalance");

              if (!status || !email || !balance) return;

              if (data.ok && data.user) {
                status.textContent = "Logged in";
                status.className = "topbar-pill";
                email.style.display = "inline-block";
                balance.style.display = "inline-block";
                email.textContent = data.user.email;
                balance.textContent = "Balance: " + data.user.balance;
              } else {
                status.textContent = "Guest";
                status.className = "topbar-pill gray";
                email.style.display = "none";
                balance.style.display = "none";
                email.textContent = "";
                balance.textContent = "";
              }
            } catch (e) {}
          }

          async function logoutTopbarUser() {
            try {
              await fetch("/logout", { method: "POST" });
              await refreshTopbarUser();
              window.location.reload();
            } catch (e) {}
          }

          document.getElementById("topbarRefreshBtn")?.addEventListener("click", refreshTopbarUser);
          document.getElementById("topbarLogoutBtn")?.addEventListener("click", logoutTopbarUser);

          refreshTopbarUser();
        </script>
      </body>
    </html>
  `;
}

function requireLoginBlock(pageName) {
  return `
    <div class="section">
      <h1>${pageName}</h1>
      <p class="muted">Please login first to access this page.</p>
      <div class="button-row" style="margin-top:16px;">
        <a class="btn btn-primary" href="/login">Go to login</a>
        <a class="btn btn-secondary" href="/register">Create account</a>
      </div>
    </div>
  `;
}

// Главная
app.get("/", (req, res) => {
  res.send(pageTemplate("Betting App", `
    <section class="hero">
      <div class="badge">Demo betting app</div>
      <h1>Practice betting without real money</h1>
      <div class="subtitle">
        Create an account, use a virtual balance, place demo bets, and track every balance change.
      </div>

      <div class="buttons">
        <a class="btn btn-primary" href="/register">Create account</a>
        <a class="btn btn-secondary" href="/login">Login</a>
        <a class="btn btn-secondary" href="/matches">Open matches</a>
        <a class="btn btn-secondary" href="/balance-history">Balance history</a>
      </div>
    </section>

    <section class="grid">
      <div class="card">
        <h3>Sessions</h3>
        <p>User login stays attached to the browser session.</p>
      </div>

      <div class="card">
        <h3>Balance ledger</h3>
        <p>Every balance movement is now stored and can be reviewed later.</p>
      </div>

      <div class="card">
        <h3>Bet flow</h3>
        <p>Stake writes a negative entry, and a winning settlement writes a positive entry.</p>
      </div>
    </section>

    <div class="footer-note">
      This is a demo app. No real money involved.
    </div>
  `));
});

// DB test
app.get("/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() as now");
    res.json({ ok: true, time: result.rows[0].now });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

// Init DB
app.get("/init-db", async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT,
        password TEXT,
        balance INT DEFAULT 1000,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS bets (
        id SERIAL PRIMARY KEY,
        user_id INT,
        match_name TEXT,
        selection TEXT,
        odds FLOAT,
        stake INT,
        possible_win INT,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      );
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
      );
    `);

    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
});

// Register API
app.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.json({ ok: false, message: "Email and password required" });
    }

    const existing = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (existing.rows.length > 0) {
      return res.json({ ok: false, message: "User already exists" });
    }

    const result = await pool.query(
      "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
      [email, password]
    );

    res.json({ ok: true, user: result.rows[0] });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
});

// Login API
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1 AND password = $2",
      [email, password]
    );

    if (result.rows.length === 0) {
      return res.json({ ok: false, message: "Invalid credentials" });
    }

    req.session.userId = result.rows[0].id;

    res.json({ ok: true, user: result.rows[0] });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
});

// Me
app.get("/me", async (req, res) => {
  try {
    const user = await getLoggedInUser(req);

    if (!user) {
      return res.json({ ok: false, message: "Not logged in" });
    }

    res.json({ ok: true, user });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
});

// Place bet
app.post("/place-bet", async (req, res) => {
  try {
    const user = await getLoggedInUser(req);

    if (!user) {
      return res.json({ ok: false, message: "Not logged in" });
    }

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

    const possible_win = Number(odds) * Number(stake);
    const newBalance = Number(user.balance) - Number(stake);

    await pool.query(
      "UPDATE users SET balance = balance - $1 WHERE id = $2",
      [stake, user.id]
    );

    const betResult = await pool.query(
      `INSERT INTO bets (user_id, match_name, selection, odds, stake, possible_win)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [user.id, match_name, selection, odds, stake, possible_win]
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

    res.json({
      ok: true,
      bet,
      newBalance
    });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
});

// Settle bet
app.post("/settle-bet", async (req, res) => {
  try {
    const { betId, status } = req.body;

    const betResult = await pool.query(
      "SELECT * FROM bets WHERE id = $1",
      [betId]
    );

    const bet = betResult.rows[0];

    if (!bet) {
      return res.json({ ok: false, message: "Bet not found" });
    }

    if (bet.status !== "pending") {
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
    }

    if (status === "lose") {
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

// Users
app.get("/users", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users ORDER BY id DESC");
    res.json({ ok: true, users: result.rows });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
});

// Bets
app.get("/bets", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT bets.*, users.email
      FROM bets
      LEFT JOIN users ON users.id = bets.user_id
      ORDER BY bets.id DESC
    `);

    res.json({ ok: true, bets: result.rows });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
});

// Balance history API
app.get("/api/balance-history", async (req, res) => {
  try {
    const user = await getLoggedInUser(req);

    if (!user) {
      return res.json({ ok: false, message: "Not logged in" });
    }

    const result = await pool.query(
      `SELECT *
       FROM balance_history
       WHERE user_id = $1
       ORDER BY id DESC`,
      [user.id]
    );

    res.json({ ok: true, history: result.rows });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
});

// Dashboard
app.get("/dashboard", async (req, res) => {
  const user = await getLoggedInUser(req);

  if (!user) {
    return res.send(pageTemplate("Dashboard", requireLoginBlock("Dashboard")));
  }

  res.send(pageTemplate("Dashboard", `
    <div class="section">
      <h1>My dashboard</h1>
      <p class="muted">See your account, current balance, and all your bets in one place.</p>

      <div class="button-row" style="margin-top:16px;">
        <button onclick="loadDashboard()">Refresh dashboard</button>
        <button class="logout-btn" onclick="logoutDashboard()">Logout</button>
      </div>
    </div>

    <div id="dashboardContent">
      <div class="section"><p>Loading...</p></div>
    </div>

    <script>
      async function loadDashboard() {
        const meRes = await fetch("/me");
        const meData = await meRes.json();

        if (!meData.ok) {
          document.getElementById("dashboardContent").innerHTML = \`
            <div class="section">
              <h2>Not logged in</h2>
              <p>Please login first.</p>
              <div class="button-row">
                <a class="btn btn-primary" href="/login">Go to login</a>
              </div>
            </div>
          \`;
          return;
        }

        const betsRes = await fetch("/bets");
        const betsData = await betsRes.json();

        const myBets = (betsData.bets || []).filter(
          bet => Number(bet.user_id) === Number(meData.user.id)
        );

        const pendingCount = myBets.filter(b => b.status === "pending").length;
        const winCount = myBets.filter(b => b.status === "win").length;
        const loseCount = myBets.filter(b => b.status === "lose").length;

        document.getElementById("dashboardContent").innerHTML = \`
          <div class="section">
            <h2>Account</h2>
            <div class="stats">
              <div class="stat">
                <div class="stat-label">Email</div>
                <div class="stat-value" style="font-size:18px;">\${meData.user.email}</div>
              </div>
              <div class="stat">
                <div class="stat-label">Balance</div>
                <div class="stat-value">\${meData.user.balance}</div>
              </div>
              <div class="stat">
                <div class="stat-label">User ID</div>
                <div class="stat-value">\${meData.user.id}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <h2>My stats</h2>
            <div class="stats">
              <div class="stat"><div class="stat-label">Total bets</div><div class="stat-value">\${myBets.length}</div></div>
              <div class="stat"><div class="stat-label">Pending</div><div class="stat-value">\${pendingCount}</div></div>
              <div class="stat"><div class="stat-label">Wins</div><div class="stat-value">\${winCount}</div></div>
              <div class="stat"><div class="stat-label">Loses</div><div class="stat-value">\${loseCount}</div></div>
            </div>
          </div>

          <div class="section">
            <h2>My bets</h2>
            \${myBets.length === 0 ? "<p>No bets yet.</p>" : myBets.map(bet => \`
              <div class="bet-row">
                <div><strong>ID:</strong> \${bet.id}</div>
                <div><strong>Match:</strong> \${bet.match_name}</div>
                <div><strong>Selection:</strong> \${bet.selection}</div>
                <div><strong>Odds:</strong> \${bet.odds}</div>
                <div><strong>Stake:</strong> \${bet.stake}</div>
                <div><strong>Possible win:</strong> \${bet.possible_win}</div>
                <div style="margin-top:8px;">
                  <span class="status-badge status-\${bet.status}">\${bet.status}</span>
                </div>
              </div>
            \`).join("")}
          </div>
        \`;
      }

      async function logoutDashboard() {
        await fetch("/logout", { method: "POST" });
        window.location.reload();
      }

      loadDashboard();
    </script>
  `));
});

// Balance history page
app.get("/balance-history", async (req, res) => {
  const user = await getLoggedInUser(req);

  if (!user) {
    return res.send(pageTemplate("Balance history", requireLoginBlock("Balance history")));
  }

  res.send(pageTemplate("Balance history", `
    <div class="section">
      <h1>Balance history</h1>
      <p class="muted">See every balance movement: stakes and winnings.</p>

      <div class="button-row" style="margin-top:16px;">
        <button onclick="loadHistory()">Refresh history</button>
      </div>
    </div>

    <div id="historyContent">
      <div class="section"><p>Loading...</p></div>
    </div>

    <script>
      async function loadHistory() {
        const res = await fetch("/api/balance-history");
        const data = await res.json();

        if (!data.ok) {
          document.getElementById("historyContent").innerHTML = \`
            <div class="section">
              <p>Could not load balance history.</p>
            </div>
          \`;
          return;
        }

        const rows = data.history || [];

        document.getElementById("historyContent").innerHTML = \`
          <div class="section">
            <h2>Entries</h2>
            \${rows.length === 0 ? "<p>No balance changes yet.</p>" : rows.map(row => \`
              <div class="history-row">
                <div><strong>Type:</strong> \${row.type}</div>
                <div><strong>Description:</strong> \${row.description || "-"}</div>
                <div><strong>Bet ID:</strong> \${row.bet_id || "-"}</div>
                <div><strong>Amount:</strong> <span class="\${Number(row.amount) >= 0 ? "amount-plus" : "amount-minus"}">\${row.amount}</span></div>
                <div><strong>Balance after:</strong> \${row.balance_after}</div>
                <div><strong>Created:</strong> \${row.created_at}</div>
              </div>
            \`).join("")}
          </div>
        \`;
      }

      loadHistory();
    </script>
  `));
});

// Register page
app.get("/register", (req, res) => {
  res.send(pageTemplate("Register", `
    <div class="box">
      <h1>Create account</h1>
      <p class="muted">Start with a virtual balance and test the betting flow.</p>
      <input id="email" placeholder="Email" />
      <input id="password" placeholder="Password" type="password" />
      <button onclick="registerUser()">Register</button>
      <pre id="out"></pre>
    </div>

    <script>
      async function registerUser() {
        const res = await fetch("/register", {
          method: "POST",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify({
            email: email.value,
            password: password.value
          })
        });

        const data = await res.json();
        out.textContent = JSON.stringify(data, null, 2);

        if (data.ok) {
          setTimeout(() => {
            window.location.href = "/login";
          }, 600);
        }
      }
    </script>
  `));
});

// Login page
app.get("/login", (req, res) => {
  res.send(pageTemplate("Login", `
    <div class="box">
      <h1>Login</h1>
      <p class="muted">Login to place bets and track your dashboard.</p>
      <input id="email" placeholder="Email" />
      <input id="password" placeholder="Password" type="password" />
      <button onclick="loginUser()">Login</button>
      <pre id="out"></pre>
    </div>

    <script>
      async function loginUser() {
        const res = await fetch("/login", {
          method: "POST",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify({
            email: email.value,
            password: password.value
          })
        });

        const data = await res.json();
        out.textContent = JSON.stringify(data, null, 2);

        if (data.ok) {
          setTimeout(() => {
            window.location.href = "/dashboard";
          }, 600);
        }
      }
    </script>
  `));
});

// Matches page
app.get("/matches", async (req, res) => {
  const user = await getLoggedInUser(req);

  if (!user) {
    return res.send(pageTemplate("Matches", requireLoginBlock("Matches")));
  }

  res.send(pageTemplate("Matches", `
    <div class="section">
      <h1>Matches</h1>
      <p class="muted">Select an outcome, enter your stake, and place your bet through the bet slip.</p>
    </div>

    <div class="matches-layout">
      <div>
        ${demoMatches.map(match => `
          <div class="match-card">
            <div class="teams">${match.team1} vs ${match.team2}</div>
            <div class="match-sub">${match.league}</div>

            <div class="odds-row">
              <button class="odds-btn" onclick="selectBet(${match.id}, 'Home', ${match.odds.home})">
                ${match.team1}<br>${match.odds.home}
              </button>

              <button class="odds-btn secondary" onclick="selectBet(${match.id}, 'Draw', ${match.odds.draw})">
                Draw<br>${match.odds.draw}
              </button>

              <button class="odds-btn dark" onclick="selectBet(${match.id}, 'Away', ${match.odds.away})">
                ${match.team2}<br>${match.odds.away}
              </button>
            </div>
          </div>
        `).join("")}
      </div>

      <div class="betslip">
        <div class="betslip-title">Bet slip</div>
        <div id="emptySlip" class="muted">Choose an outcome to add it here.</div>

        <div id="slipContent" style="display:none;">
          <div class="selected-box">
            <div><strong id="slipMatch"></strong></div>
            <div class="muted" id="slipSelection"></div>
            <div style="margin-top:8px;"><strong>Odds:</strong> <span id="slipOdds"></span></div>
          </div>

          <input id="slipStake" placeholder="Stake (e.g. 100)" oninput="updatePossibleWin()" />

          <div class="selected-box">
            <div><strong>Possible win</strong></div>
            <div style="font-size:26px; font-weight:bold; color:#1d4ed8;" id="possibleWin">0</div>
          </div>

          <button onclick="placeSlipBet()">Place bet</button>
        </div>

        <div style="margin-top:18px;">
          <pre id="out"></pre>
        </div>
      </div>
    </div>

    <script>
      const matches = ${JSON.stringify(demoMatches)};
      let selectedBet = null;

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
      }

      function updatePossibleWin() {
        if (!selectedBet) return;
        const stake = Number(document.getElementById("slipStake").value || 0);
        const win = stake * selectedBet.odds;
        document.getElementById("possibleWin").textContent = String(win || 0);
      }

      async function placeSlipBet() {
        if (!selectedBet) return;

        const stake = Number(document.getElementById("slipStake").value || 0);

        const res = await fetch("/place-bet", {
          method: "POST",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify({
            match_name: selectedBet.match_name,
            selection: selectedBet.selection,
            odds: selectedBet.odds,
            stake: stake
          })
        });

        const data = await res.json();
        document.getElementById("out").textContent = JSON.stringify(data, null, 2);
      }
    </script>
  `));
});

// Admin
app.get("/admin", (req, res) => {
  res.send(pageTemplate("Admin panel", `
    <div class="section">
      <h1>Admin panel</h1>
      <p class="muted">Manage bets and settle them with one click.</p>
      <button onclick="loadBets()">Refresh bets</button>
      <div id="betsBox" style="margin-top:20px;"></div>
    </div>

    <script>
      async function settleBet(betId, status) {
        const res = await fetch("/settle-bet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ betId, status })
        });

        const data = await res.json();
        alert(JSON.stringify(data, null, 2));
        loadBets();
      }

      async function loadBets() {
        const res = await fetch("/bets");
        const data = await res.json();

        if (!data.ok) {
          document.getElementById("betsBox").innerHTML = "<p>Error loading bets</p>";
          return;
        }

        if (!data.bets.length) {
          document.getElementById("betsBox").innerHTML = "<p>No bets yet</p>";
          return;
        }

        document.getElementById("betsBox").innerHTML = data.bets.map(bet => \`
          <div class="card">
            <div><strong>ID:</strong> \${bet.id}</div>
            <div><strong>User:</strong> \${bet.email || bet.user_id}</div>
            <div><strong>Match:</strong> \${bet.match_name}</div>
            <div><strong>Selection:</strong> \${bet.selection}</div>
            <div><strong>Odds:</strong> \${bet.odds}</div>
            <div><strong>Stake:</strong> \${bet.stake}</div>
            <div><strong>Possible win:</strong> \${bet.possible_win}</div>
            <div><strong>Status:</strong> \${bet.status}</div>
            <div class="button-row" style="margin-top:10px;">
              <button class="win-btn" onclick="settleBet(\${bet.id}, 'win')">WIN</button>
              <button class="lose-btn" onclick="settleBet(\${bet.id}, 'lose')">LOSE</button>
            </div>
          </div>
        \`).join("");
      }

      loadBets();
    </script>
  `));
});

// Logout
app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

// Compatibility routes
app.get("/test-register", (req, res) => res.redirect("/register"));
app.get("/test-login", (req, res) => res.redirect("/login"));
app.get("/test-bet", (req, res) => res.redirect("/matches"));
app.get("/test-settle", (req, res) => res.redirect("/admin"));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Server started"));
