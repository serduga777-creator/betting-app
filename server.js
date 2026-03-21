require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

// главный маршрут
app.get("/", (req, res) => {
  res.send("🚀 Betting app is running");
});

// проверка базы данных
app.get("/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() as now");

    res.json({
      ok: true,
      time: result.rows[0].now
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

// запуск сервера
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log("Server started on port " + port);
});
