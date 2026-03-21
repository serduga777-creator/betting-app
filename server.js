
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

// Главная
app.get("/", (req, res) => {
  res.send("Betting app is running");
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

// Запуск сервера
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log("Server started on port " + port);
});
