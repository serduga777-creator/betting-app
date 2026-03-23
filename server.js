require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

function pageTemplate(title, content) {
  return `
    <html>
      <head>
        <title>${title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            font-family: Arial, sans-serif;
            background: #f5f7fb;
            color: #111827;
          }

          .container {
            max-width: 1100px;
            margin: 0 auto;
            padding: 24px;
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

          .quick-links {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
          }

          .quick-links a {
            text-decoration: none;
            color: #1d4ed8;
            background: #eff6ff;
            padding: 10px 14px;
            border-radius: 10px;
            font-weight: bold;
          }

          .box {
            max-width: 520px;
            background: white;
            padding: 24px;
            border-radius: 18px;
            box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
          }

          input, select, button, textarea {
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

          .button-row button {
            width: auto;
            min-width: 110px;
          }

          .win-btn {
            background: #16a34a;
          }

          .lose-btn {
            background: #dc2626;
          }

          .logout-btn {
            background: #475569;
          }

          .odds-row {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 8px;
            margin-top: 12px;
            margin-bottom: 10px;
          }

          .odds-btn {
            background: #1d4ed8;
            color: white;
            border: none;
            border-radius: 12px;
            padding: 12px 10px;
            font-weight: bold;
            font-size: 14px;
          }

          .odds-btn.secondary {
            background: #0f766e;
          }

          .odds-btn.dark {
            background: #4338ca;
          }

          pre {
            background: #f4f4f4;
            padding: 14px;
            white-space: pre-wrap;
            border-radius: 12px;
            overflow: auto;
          }

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

          .status-badge {
            display: inline-block;
            padding: 6px 10px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
          }

          .status-pending {
            background: #fef3c7;
            color: #92400e;
          }

          .status-win {
            background: #dcfce7;
            color: #166534;
          }

          .status-lose {
            background: #fee2e2;
            color: #991b1b;
          }

          .footer-note {
            font-size: 14px;
            color: #64748b;
            text-align: center;
            padding-bottom: 20px;
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
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="nav">
            <a href="/">Home</a>
            <a href="/test-register">Register</a>
            <a href="/test-login">Login</a>
            <a href="/matches">Matches</a>
            <a href="/test-bet">Bet</a>
            <a href="/test-settle">Settle</a>
            <a href="/dashboard">Dashboard</a>
            <a href="/admin">Admin</a>
            <a href="/users">Users</a>
            <a href="/bets">Bets</a>
          </div>
          ${content}
        </div>
      </body>
    </html>
  `;
}

// Глобальный текущий пользователь для MVP
let currentUser = null;

// Демо матчи
const matches = [
  {
    id: 1,
    team1: "Real Madrid",
    team2: "Barcelona",
    odds: { home: 2.1, draw: 3.5, away: 3.0 }
  },
  {
    id: 2,
    team1: "Man City",
    team2: "Liverpool",
    odds: { home: 1.9, draw: 3.8, away: 3.4 }
  },
  {
    id: 3,
    team1: "Bayern",
    team2: "Dortmund",
    odds: { home: 1.7, draw: 4.0, away: 4.5 }
  }
];

// Главная
app.get("/", (req, res) => {
  res.send(pageTemplate("Betting App", `
    <section class="hero">
      <div class="badge">Demo betting app</div>
      <h1>Practice betting without real money</h1>
      <div class="subtitle">
        Create an account, use a virtual balance, place demo bets, and settle them through a simple admin panel. This is a product MVP for testing the betting experience.
      </div>

      <div class="buttons">
        <a class="btn btn-primary" href="/test-register">Create account</a>
        <a class="btn btn-secondary" href="/test-login">Login</a>
        <a class="btn btn-secondary" href="/matches">Open matches</a>
        <a class="btn btn-secondary" href="/dashboard">My dashboard</a>
      </div>
    </section>

    <section class="grid">
      <div class="card">
        <h3>Virtual balance</h3>
        <p>Each new user gets a demo balance, so the whole experience works without real money.</p>
      </div>

      <div class="card">
        <h3>Ready-made matches</h3>
        <p>Choose from a list of demo matches instead of entering everything by hand.</p>
      </div>

      <div class="card">
        <h3>Admin settlement</h3>
        <p>Use the admin panel to settle bets and automatically update the player balance.</p>
      </div>
    </section>

    <section class="section">
      <h2>How it works</h2>
      <ol style="line-height:1.9; color:#334155; padding-left:20px;">
        <li>Create a new account on the register page.</li>
        <li>Login with your email and password.</li>
        <li>Open matches and place a bet using your virtual balance.</li>
        <li>Open the admin panel and settle the bet as win or lose.</li>
        <li>Check updated balance and bet history in your dashboard.</li>
      </ol>
    </section>

    <section class="section">
      <h2>Quick links</h2>
      <div class="quick-links">
        <a href="/db-test">DB test</a>
        <a href="/init-db">Init DB</a>
        <a href="/test-register">Register</a>
        <a href="/test-login">Login</a>
        <a href="/matches">Matches</a>
        <a href="/test-bet">Manual Bet</a>
        <a href="/test-settle">Settle</a>
        <a href="/dashboard">Dashboard</a>
        <a href="/admin">Admin</a>
        <a href="/users">Users</a>
        <a href="/bets">Bets</a>
      </div>
    </section>

    <div class="footer-note">
      This is a demo app. No real money involved.
    </div>
  `));
});

// Проверка базы
app.get("/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() as now");
    res.json({ ok: true, time: result.rows[0].now });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

// Создание таблиц
app.get("/init-db", async (req, res) => {
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

  res.json({ ok: true });
});

// Регистрация
app.post("/register", async (req, res) => {
  const { email, password } = req.body;

  const result = await pool.query(
    "INSERT INTO users (email, password) VALUES ($1,$2) RETURNING *",
    [email, password]
  );

  res.json({ ok: true, user: result.rows[0] });
});

// Логин
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const result = await pool.query(
    "SELECT * FROM users WHERE email=$1 AND password=$2",
    [email, password]
  );

  if (result.rows.length === 0) {
    return res.json({ ok: false, message: "Invalid credentials" });
  }

  currentUser = result.rows[0];
  res.json({ ok: true, user: currentUser });
});

// Профиль JSON
app.get("/me", async (req, res) => {
  if (!currentUser) return res.json({ ok: false, message: "Not logged in" });

  const userResult = await pool.query(
    "SELECT * FROM users WHERE id=$1",
    [currentUser.id]
  );

  currentUser = userResult.rows[0];
  res.json({ ok: true, user: currentUser });
});

// Поставить ставку
app.post("/place-bet", async (req, res) => {
  if (!currentUser) {
    return res.json({ ok: false, message: "Not logged in" });
  }

  const { match_name, selection, odds, stake } = req.body;
  const possible_win = Number(odds) * Number(stake);

  await pool.query(
    "UPDATE users SET balance = balance - $1 WHERE id=$2",
    [stake, currentUser.id]
  );

  const result = await pool.query(
    `INSERT INTO bets (user_id, match_name, selection, odds, stake, possible_win)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [currentUser.id, match_name, selection, odds, stake, possible_win]
  );

  const updatedUser = await pool.query(
    "SELECT * FROM users WHERE id=$1",
    [currentUser.id]
  );

  currentUser = updatedUser.rows[0];

  res.json({
    ok: true,
    bet: result.rows[0],
    newBalance: currentUser.balance
  });
});

// Settling ставки
app.post("/settle-bet", async (req, res) => {
  const { betId, status } = req.body;

  const betResult = await pool.query(
    "SELECT * FROM bets WHERE id=$1",
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
    "UPDATE bets SET status=$1 WHERE id=$2",
    [status, betId]
  );

  let newBalance = null;

  if (status === "win") {
    await pool.query(
      "UPDATE users SET balance = balance + $1 WHERE id=$2",
      [bet.possible_win, bet.user_id]
    );

    const userResult = await pool.query(
      "SELECT balance FROM users WHERE id=$1",
      [bet.user_id]
    );
    newBalance = userResult.rows[0].balance;
  }

  if (status === "lose") {
    const userResult = await pool.query(
      "SELECT balance FROM users WHERE id=$1",
      [bet.user_id]
    );
    newBalance = userResult.rows[0].balance;
  }

  if (currentUser && Number(currentUser.id) === Number(bet.user_id)) {
    const updatedCurrentUser = await pool.query(
      "SELECT * FROM users WHERE id=$1",
      [currentUser.id]
    );
    currentUser = updatedCurrentUser.rows[0];
  }

  res.json({ ok: true, message: "Bet settled", newBalance });
});

// Пользователи
app.get("/users", async (req, res) => {
  const result = await pool.query("SELECT * FROM users ORDER BY id DESC");
  res.json({ ok: true, users: result.rows });
});

// Ставки
app.get("/bets", async (req, res) => {
  const result = await pool.query(`
    SELECT bets.*, users.email
    FROM bets
    LEFT JOIN users ON users.id = bets.user_id
    ORDER BY bets.id DESC
  `);
  res.json({ ok: true, bets: result.rows });
});

// Dashboard
app.get("/dashboard", (req, res) => {
  res.send(pageTemplate("Dashboard", `
    <div class="section">
      <h1>My dashboard</h1>
      <p style="color:#64748b;">See your account, current balance, and all your bets in one place.</p>

      <div class="button-row" style="margin-top:16px;">
        <button onclick="loadDashboard()">Refresh dashboard</button>
        <button class="logout-btn" onclick="logout()">Logout</button>
      </div>
    </div>

    <div id="dashboardContent">
      <div class="section">
        <p>Loading...</p>
      </div>
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
              <div class="quick-links">
                <a href="/test-login">Go to login</a>
              </div>
            </div>
          \`;
          return;
        }

        const betsRes = await fetch("/bets");
        const betsData = await betsRes.json();

        const myBets = (betsData.bets || []).filter(bet => Number(bet.user_id) === Number(meData.user.id));

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
              <div class="stat">
                <div class="stat-label">Total bets</div>
                <div class="stat-value">\${myBets.length}</div>
              </div>
              <div class="stat">
                <div class="stat-label">Pending</div>
                <div class="stat-value">\${pendingCount}</div>
              </div>
              <div class="stat">
                <div class="stat-label">Wins</div>
                <div class="stat-value">\${winCount}</div>
              </div>
              <div class="stat">
                <div class="stat-label">Loses</div>
                <div class="stat-value">\${loseCount}</div>
              </div>
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

      async function logout() {
        await fetch("/logout", { method: "POST" });
        loadDashboard();
      }

      loadDashboard();
    </script>
  `));
});

// Logout
app.post("/logout", (req, res) => {
  currentUser = null;
  res.json({ ok: true });
});

// Страница регистрации
app.get("/test-register", (req, res) => {
  res.send(pageTemplate("Register", `
    <div class="box">
      <h1>Create account</h1>
      <p style="color:#64748b;">Start with a virtual balance and test the betting flow.</p>
      <input id="email" placeholder="Email" />
      <input id="password" placeholder="Password" type="password" />
      <button onclick="reg()">Register</button>
      <pre id="out"></pre>
    </div>

    <script>
      async function reg() {
        const res = await fetch("/register", {
          method: "POST",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify({
            email: email.value,
            password: password.value
          })
        });
        out.textContent = JSON.stringify(await res.json(), null, 2);
      }
    </script>
  `));
});

// Страница логина
app.get("/test-login", (req, res) => {
  res.send(pageTemplate("Login", `
    <div class="box">
      <h1>Login</h1>
      <p style="color:#64748b;">Login to place bets and track your dashboard.</p>
      <input id="email" placeholder="Email" />
      <input id="password" placeholder="Password" type="password" />
      <button onclick="login()">Login</button>
      <pre id="out"></pre>
    </div>

    <script>
      async function login() {
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

// Страница готовых матчей
app.get("/matches", (req, res) => {
  res.send(pageTemplate("Matches", `
    <div class="section">
      <h1>Matches</h1>
      <p style="color:#64748b;">Choose a match and place a bet instantly.</p>
    </div>

    <div class="grid">
      ${matches.map(match => `
        <div class="card">
          <h3>${match.team1} vs ${match.team2}</h3>
          <p>Pick an outcome and enter your stake.</p>

          <div class="odds-row">
            <button class="odds-btn" onclick="bet(${match.id}, 'Home', ${match.odds.home})">
              ${match.team1}<br/>${match.odds.home}
            </button>

            <button class="odds-btn secondary" onclick="bet(${match.id}, 'Draw', ${match.odds.draw})">
              Draw<br/>${match.odds.draw}
            </button>

            <button class="odds-btn dark" onclick="bet(${match.id}, 'Away', ${match.odds.away})">
              ${match.team2}<br/>${match.odds.away}
            </button>
          </div>

          <input id="stake-${match.id}" placeholder="Stake (e.g. 100)" />
        </div>
      `).join("")}
    </div>

    <div class="section">
      <h2>Result</h2>
      <pre id="out"></pre>
    </div>

    <script>
      const matches = ${JSON.stringify(matches)};

      async function bet(matchId, selection, odds) {
        const stake = document.getElementById("stake-" + matchId).value;
        const match = matches.find(m => m.id === matchId);

        const selectionText =
          selection === "Home" ? match.team1 + " win" :
          selection === "Away" ? match.team2 + " win" :
          "Draw";

        const res = await fetch("/place-bet", {
          method: "POST",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify({
            match_name: match.team1 + " vs " + match.team2,
            selection: selectionText,
            odds: Number(odds),
            stake: Number(stake)
          })
        });

        const data = await res.json();
        document.getElementById("out").textContent = JSON.stringify(data, null, 2);
      }
    </script>
  `));
});

// Страница ручной ставки
app.get("/test-bet", (req, res) => {
  res.send(pageTemplate("Bet", `
    <div class="box">
      <h1>Manual bet</h1>
      <p style="color:#64748b;">Use this page if you want to enter bet data manually.</p>
      <input id="match" placeholder="Match name (e.g. Real vs Barca)" />
      <input id="sel" placeholder="Selection (e.g. Real win)" />
      <input id="odds" placeholder="Odds (e.g. 2.0)" />
      <input id="stake" placeholder="Stake (e.g. 100)" />
      <button onclick="bet()">Place bet</button>
      <pre id="out"></pre>
    </div>

    <script>
      async function bet() {
        const res = await fetch("/place-bet", {
          method: "POST",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify({
            match_name: match.value,
            selection: sel.value,
            odds: Number(odds.value),
            stake: Number(stake.value)
          })
        });
        out.textContent = JSON.stringify(await res.json(), null, 2);
      }
    </script>
  `));
});

// Страница settle
app.get("/test-settle", (req, res) => {
  res.send(pageTemplate("Settle bet", `
    <div class="box">
      <h1>Settle bet</h1>
      <p style="color:#64748b;">Enter bet ID and mark it as win or lose.</p>
      <input id="id" placeholder="Bet ID" />
      <select id="status">
        <option value="win">win</option>
        <option value="lose">lose</option>
      </select>
      <button onclick="settle()">Settle</button>
      <pre id="out"></pre>
    </div>

    <script>
      async function settle() {
        const res = await fetch("/settle-bet", {
          method: "POST",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify({
            betId: Number(id.value),
            status: status.value
          })
        });
        out.textContent = JSON.stringify(await res.json(), null, 2);
      }
    </script>
  `));
});

// Админка
app.get("/admin", (req, res) => {
  res.send(pageTemplate("Admin panel", `
    <div class="section">
      <h1>Admin panel</h1>
      <p style="color:#64748b;">Manage bets and settle them with one click.</p>
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

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Server started"));
