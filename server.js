
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
        <p><a href="/test-register">Open register test page</a></p>
        <p><a href="/users">View users</a></p>
        <p><a href="/db-test">DB test</a></p>
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
      errorMessage: error?.message || null
    });
  }
});

// Создание таблицы users
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

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

// Тестовая HTML-страница регистрации
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

        <pre id="result" style="margin-top:20px; background:#f4f4f4; padding:10px;"></pre>

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
            document.getElementById("result").textContent = JSON.stringify(data, null, 2);
          });
        </script>
      </body>
    </html>
  `);
});
            const data = await response.json();
            document.getElementById("result").textContent = JSON.stringify(data, null, 2);
          });
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

// Запуск сервера
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log("Server started on port " + port);
});
