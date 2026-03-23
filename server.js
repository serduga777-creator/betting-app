require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

// Главная
app.get("/", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Betting App</title>
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
            font-size: 40px;
            line-height: 1.1;
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
            transition: 0.2s ease;
          }

          .btn:hover {
            transform: translateY(-1px);
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
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
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

          .section h2 {
            margin-top: 0;
            margin-bottom: 14px;
          }

          .section ol {
            margin: 0;
            padding-left: 20px;
            line-height: 1.9;
            color: #334155;
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

          .footer-note {
            font-size: 14px;
            color: #64748b;
            text-align: center;
            padding-bottom: 20px;
          }

          @media (max-width: 640px) {
            h1 {
              font-size: 30px;
            }

            .subtitle {
              font-size: 16px;
            }

            .hero {
              padding: 28px 20px;
            }

            .container {
              padding: 16px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <section class="hero">
            <div class="badge">Demo betting app</div>
            <h1>Practice betting without real money</h1>
            <div class="subtitle">
              Create an account, use a virtual balance, place demo bets, and settle them through a simple admin panel. This is a product MVP for testing the betting experience.
            </div>

            <div class="buttons">
              <a class="btn btn-primary" href="/test-register">Create account</a>
              <a class="btn btn-secondary" href="/test-login">Login</a>
              <a class="btn btn-secondary" href="/test-bet">Start betting</a>
              <a class="btn btn-secondary" href="/admin">Admin panel</a>
            </div>
          </section>

          <section class="grid">
            <div class="card">
              <h3>Virtual balance</h3>
              <p>Each new user gets a demo balance, so the whole experience works without real money.</p>
            </div>

            <div class="card">
              <h3>Simple betting flow</h3>
              <p>Register, login, place a bet, and track status changes like pending, win, and lose.</p>
            </div>

            <div class="card">
              <h3>Admin settlement</h3>
              <p>Use the admin panel to settle bets and automatically update the player balance.</p>
            </div>
          </section>

          <section class="section">
            <h2>How it works</h2>
            <ol>
              <li>Create a new account on the register page.</li>
              <li>Login with your email and password.</li>
              <li>Place a bet using your virtual balance.</li>
              <li>Open the admin panel and settle the bet as win or lose.</li>
              <li>Check updated balance and bet history.</li>
            </ol>
          </section>

          <section class="section">
            <h2>Quick links</h2>
            <div class="quick-links">
              <a href="/db-test">DB test</a>
              <a href="/init-db">Init DB</a>
              <a href="/test-register">Register</a>
              <a href="/test-login">Login</a>
              <a href="/test-bet">Bet</a>
              <a href="/test-settle">Settle</a>
              <a href="/admin">Admin</a>
              <a href="/users">Users</a>
              <a href="/bets">Bets</a>
              <a href="/me">My profile</a>
            </div>
          </section>

          <div class="footer-note">
            This is a demo app. No real money involved.
          </div>
        </div>
      </body>
    </html>
  `);
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
let currentUser = null;

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

// Профиль
app.get("/me", (req, res) => {
  if (!currentUser) return res.send("Not logged in");
  res.json(currentUser);
});

// Поставить ставку
app.post("/place-bet", async (req, res) => {
  if (!currentUser) {
    return res.json({ ok: false, message: "Not logged in" });
  }

  const { match_name, selection, odds, stake } = req.body;
  const possible_win = odds * stake;

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

// Страница регистрации
app.get("/test-register", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Register test</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; background:#f5f7fb; }
          .box { max-width: 420px; background:white; padding:24px; border-radius:16px; box-shadow:0 10px 28px rgba(15,23,42,0.06); }
          input, button { width:100%; margin:8px 0; padding:14px; border-radius:10px; border:1px solid #dbe2ea; }
          button { background:#2563eb; color:white; font-weight:bold; border:none; }
          pre { background:#f4f4f4; padding:10px; white-space:pre-wrap; border-radius:10px; }
        </style>
      </head>
      <body>
        <div class="box">
          <h1>Register test</h1>
          <input id="email" placeholder="Email" />
          <input id="password" placeholder="Password" />
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
            out.textContent = JSON.stringify(await res.json(),null,2);
          }
        </script>
      </body>
    </html>
  `);
});

// Страница логина
app.get("/test-login", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Login test</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; background:#f5f7fb; }
          .box { max-width: 420px; background:white; padding:24px; border-radius:16px; box-shadow:0 10px 28px rgba(15,23,42,0.06); }
          input, button { width:100%; margin:8px 0; padding:14px; border-radius:10px; border:1px solid #dbe2ea; }
          button { background:#2563eb; color:white; font-weight:bold; border:none; }
          pre { background:#f4f4f4; padding:10px; white-space:pre-wrap; border-radius:10px; }
        </style>
      </head>
      <body>
        <div class="box">
          <h1>Login test</h1>
          <input id="email" />
          <input id="password" />
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
            out.textContent = JSON.stringify(await res.json(),null,2);
          }
        </script>
      </body>
    </html>
  `);
});

// Страница ставки
app.get("/test-bet", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Bet test</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; background:#f5f7fb; }
          .box { max-width: 420px; background:white; padding:24px; border-radius:16px; box-shadow:0 10px 28px rgba(15,23,42,0.06); }
          input, button { width:100%; margin:8px 0; padding:14px; border-radius:10px; border:1px solid #dbe2ea; }
          button { background:#2563eb; color:white; font-weight:bold; border:none; }
          pre { background:#f4f4f4; padding:10px; white-space:pre-wrap; border-radius:10px; }
        </style>
      </head>
      <body>
        <div class="box">
          <h1>Bet test</h1>
          <p>Сначала логин через <a href="/test-login">/test-login</a></p>
          <input id="match" placeholder="Match" />
          <input id="sel" placeholder="Selection" />
          <input id="odds" placeholder="Odds" />
          <input id="stake" placeholder="Stake" />
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
            out.textContent = JSON.stringify(await res.json(),null,2);
          }
        </script>
      </body>
    </html>
  `);
});

// Страница settle
app.get("/test-settle", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Settle bet test</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; background:#f5f7fb; }
          .box { max-width: 420px; background:white; padding:24px; border-radius:16px; box-shadow:0 10px 28px rgba(15,23,42,0.06); }
          input, select, button { width:100%; margin:8px 0; padding:14px; border-radius:10px; border:1px solid #dbe2ea; }
          button { background:#2563eb; color:white; font-weight:bold; border:none; }
          pre { background:#f4f4f4; padding:10px; white-space:pre-wrap; border-radius:10px; }
        </style>
      </head>
      <body>
        <div class="box">
          <h1>Settle bet test</h1>
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
            out.textContent = JSON.stringify(await res.json(),null,2);
          }
        </script>
      </body>
    </html>
  `);
});

// Админка
app.get("/admin", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Admin panel</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 24px;
            background: #f5f7fb;
          }
          .card {
            border: 1px solid #dbe2ea;
            background: white;
            border-radius: 16px;
            padding: 16px;
            margin-bottom: 16px;
            box-shadow: 0 10px 28px rgba(15,23,42,0.06);
          }
          button {
            margin-right: 8px;
            margin-top: 10px;
            padding: 10px 14px;
            border: none;
            border-radius: 10px;
            font-weight: bold;
            cursor: pointer;
          }
          .win-btn {
            background: #16a34a;
            color: white;
          }
          .lose-btn {
            background: #dc2626;
            color: white;
          }
          .refresh-btn {
            background: #2563eb;
            color: white;
          }
        </style>
      </head>
      <body>
        <h1>Admin panel</h1>
        <button class="refresh-btn" onclick="loadBets()">Refresh bets</button>
        <div id="betsBox" style="margin-top:20px;"></div>

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
                <div>
                  <button class="win-btn" onclick="settleBet(\${bet.id}, 'win')">WIN</button>
                  <button class="lose-btn" onclick="settleBet(\${bet.id}, 'lose')">LOSE</button>
                </div>
              </div>
            \`).join("");
          }

          loadBets();
        </script>
      </body>
    </html>
  `);
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Server started"));
