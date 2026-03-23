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
      </head>
      <body style="font-family: Arial; padding: 20px;">
        <h1>Betting app is running</h1>
        <ul>
          <li><a href="/db-test">DB test</a></li>
          <li><a href="/init-db">Init DB</a></li>
          <li><a href="/test-register">Register test</a></li>
          <li><a href="/test-login">Login test</a></li>
          <li><a href="/test-bet">Bet test</a></li>
          <li><a href="/me">My profile</a></li>
          <li><a href="/users">Users</a></li>
          <li><a href="/bets">Bets</a></li>
        </ul>
      </body>
    </html>
  `);
});

// Проверка базы
app.get("/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() as now");
    res.json({
      ok: true,
      time: result.rows[0].now,
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL)
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      errorMessage: error?.message || null,
      errorCode: error?.code || null,
      errorName: error?.name || null,
      errorString: String(error)
    });
  }
});

// Создание таблиц
app.get("/init-db", async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        balance NUMERIC DEFAULT 1000,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS bets (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        match_name TEXT NOT NULL,
        selection TEXT NOT NULL,
        odds NUMERIC NOT NULL,
        stake NUMERIC NOT NULL,
        possible_win NUMERIC NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

// Тестовая страница регистрации
app.get("/test-register", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Register Test</title>
      </head>
      <body style="font-family: Arial; padding: 20px;">
        <h1>Register test</h1>

        <form id="registerForm" style="display:flex; flex-direction:column; gap:10px; max-width:320px;">
          <input id="email" type="email" placeholder="Email" required />
          <input id="password" type="password" placeholder="Password" required />
          <button type="submit">Register</button>
        </form>

        <pre id="result" style="margin-top:20px; background:#f4f4f4; padding:10px; white-space:pre-wrap;"></pre>

        <script>
          document.getElementById("registerForm").addEventListener("submit", async function (e) {
            e.preventDefault();

            const email = document.getElementById("email").value;
            const password = document.getElementById("password").value;

            const response = await fetch("/register", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            document.getElementById("result").textContent = JSON.stringify(data, null, 2);
          });
        </script>
      </body>
    </html>
  `);
});

// Тестовая страница логина
app.get("/test-login", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Login Test</title>
      </head>
      <body style="font-family: Arial; padding: 20px;">
        <h1>Login test</h1>

        <form id="loginForm" style="display:flex; flex-direction:column; gap:10px; max-width:320px;">
          <input id="email" type="email" placeholder="Email" required />
          <input id="password" type="password" placeholder="Password" required />
          <button type="submit">Login</button>
        </form>

        <p style="margin-top:16px;">
          <a href="/me">Open my profile</a><br/>
          <a href="/test-bet">Open bet page</a>
        </p>

        <pre id="result" style="margin-top:20px; background:#f4f4f4; padding:10px; white-space:pre-wrap;"></pre>

        <script>
          document.getElementById("loginForm").addEventListener("submit", async function (e) {
            e.preventDefault();

            const email = document.getElementById("email").value;
            const password = document.getElementById("password").value;

            const response = await fetch("/login", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.ok && data.user) {
              localStorage.setItem("currentUser", JSON.stringify(data.user));
            }

            document.getElementById("result").textContent = JSON.stringify(data, null, 2);
          });
        </script>
      </body>
    </html>
  `);
});

// Мой профиль
app.get("/me", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>My Profile</title>
      </head>
      <body style="font-family: Arial; padding: 20px;">
        <h1>My profile</h1>

        <div id="userBox" style="background:#f4f4f4; padding:10px; white-space:pre-wrap;"></div>

        <p style="margin-top:16px;">
          <button id="refreshBtn">Refresh balance</button>
          <button id="logoutBtn">Logout</button>
        </p>

        <p>
          <a href="/test-bet">Open bet page</a><br/>
          <a href="/bets">Open all bets</a>
        </p>

        <script>
          async function loadMe() {
            const raw = localStorage.getItem("currentUser");
            if (!raw) {
              document.getElementById("userBox").textContent = "No logged in user";
              return;
            }

            const currentUser = JSON.parse(raw);

            const response = await fetch("/user/" + currentUser.id);
            const data = await response.json();

            if (data.ok && data.user) {
              localStorage.setItem("currentUser", JSON.stringify(data.user));
            }

            document.getElementById("userBox").textContent = JSON.stringify(data, null, 2);
          }

          document.getElementById("refreshBtn").addEventListener("click", loadMe);

          document.getElementById("logoutBtn").addEventListener("click", function () {
            localStorage.removeItem("currentUser");
            document.getElementById("userBox").textContent = "Logged out";
          });

          loadMe();
        </script>
      </body>
    </html>
  `);
});

// Тестовая страница ставки
app.get("/test-bet", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Bet Test</title>
      </head>
      <body style="font-family: Arial; padding: 20px;">
        <h1>Bet test</h1>

        <p id="currentUserBox" style="background:#f4f4f4; padding:10px; white-space:pre-wrap;"></p>

        <form id="betForm" style="display:flex; flex-direction:column; gap:10px; max-width:320px;">
          <input id="matchName" type="text" placeholder="Match name" required />
          <input id="selection" type="text" placeholder="Selection" required />
          <input id="odds" type="number" step="0.01" placeholder="Odds" required />
          <input id="stake" type="number" step="0.01" placeholder="Stake" required />
          <button type="submit">Place bet</button>
        </form>

        <pre id="result" style="margin-top:20px; background:#f4f4f4; padding:10px; white-space:pre-wrap;"></pre>

        <script>
          function getCurrentUser() {
            const raw = localStorage.getItem("currentUser");
            return raw ? JSON.parse(raw) : null;
          }

          function renderCurrentUser() {
            const user = getCurrentUser();
            document.getElementById("currentUserBox").textContent = user
              ? "Logged in as: " + user.email + " | balance: " + user.balance + " | userId: " + user.id
              : "No logged in user. First open /test-login";
          }

          document.getElementById("betForm").addEventListener("submit", async function (e) {
            e.preventDefault();

            const currentUser = getCurrentUser();

            if (!currentUser) {
              document.getElementById("result").textContent = JSON.stringify({
                ok: false,
                error: "No logged in user. Open /test-login first."
              }, null, 2);
              return;
            }

            const matchName = document.getElementById("matchName").value;
            const selection = document.getElementById("selection").value;
            const odds = Number(document.getElementById("odds").value);
            const stake = Number(document.getElementById("stake").value);

            const response = await fetch("/place-bet", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                userId: currentUser.id,
                matchName,
                selection,
                odds,
                stake
              })
            });

            const data = await response.json();

            if (data.ok && typeof data.newBalance !== "undefined") {
              currentUser.balance = data.newBalance;
              localStorage.setItem("currentUser", JSON.stringify(currentUser));
              renderCurrentUser();
            }

            document.getElementById("result").textContent = JSON.stringify(data, null, 2);
          });

          renderCurrentUser();
        </script>
      </body>
    </html>
  `);
});

// Регистрация
app.post("/register", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      ok: false,
      error: "Email and password are required"
    });
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO users (email, password)
      VALUES ($1, $2)
      RETURNING id, email, balance, created_at
      `,
      [email, password]
    );

    res.json({
      ok: true,
      user: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

// Логин
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      ok: false,
      error: "Email and password are required"
    });
  }

  try {
    const result = await pool.query(
      `
      SELECT id, email, balance, created_at
      FROM users
      WHERE email = $1 AND password = $2
      LIMIT 1
      `,
      [email, password]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        ok: false,
        error: "Invalid credentials"
      });
    }

    res.json({
      ok: true,
      user: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

// Поставить ставку
app.post("/place-bet", async (req, res) => {
  const { userId, matchName, selection, odds, stake } = req.body;

  if (!userId || !matchName || !selection || !odds || !stake) {
    return res.status(400).json({
      ok: false,
      error: "userId, matchName, selection, odds and stake are required"
    });
  }

  try {
    const userResult = await pool.query(
      `SELECT id, email, balance FROM users WHERE id = $1 LIMIT 1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: "User not found"
      });
    }

    const user = userResult.rows[0];
    const currentBalance = Number(user.balance);
    const stakeValue = Number(stake);
    const oddsValue = Number(odds);

    if (stakeValue <= 0 || oddsValue <= 1) {
      return res.status(400).json({
        ok: false,
        error: "Invalid stake or odds"
      });
    }

    if (currentBalance < stakeValue) {
      return res.status(400).json({
        ok: false,
        error: "Not enough balance"
      });
    }

    const newBalance = currentBalance - stakeValue;
    const possibleWin = stakeValue * oddsValue;

    await pool.query(
      `UPDATE users SET balance = $1 WHERE id = $2`,
      [newBalance, userId]
    );

    const betResult = await pool.query(
      `
      INSERT INTO bets (user_id, match_name, selection, odds, stake, possible_win)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [userId, matchName, selection, oddsValue, stakeValue, possibleWin]
    );

    res.json({
      ok: true,
      message: "Bet placed successfully",
      bet: betResult.rows[0],
      newBalance
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

// Список пользователей
app.get("/users", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, email, balance, created_at
      FROM users
      ORDER BY id DESC
    `);

    res.json({
      ok: true,
      users: result.rows
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

// Список ставок
app.get("/bets", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        bets.id,
        bets.user_id,
        users.email,
        bets.match_name,
        bets.selection,
        bets.odds,
        bets.stake,
        bets.possible_win,
        bets.status,
        bets.created_at
      FROM bets
      JOIN users ON users.id = bets.user_id
      ORDER BY bets.id DESC
    `);

    res.json({
      ok: true,
      bets: result.rows
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

// Пользователь по id
app.get("/user/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT id, email, balance, created_at
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: "User not found"
      });
    }

    res.json({
      ok: true,
      user: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

// Запуск сервера
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log("Server started on port " + port);
});
