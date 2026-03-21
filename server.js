
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Betting app is running");
});

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
      errorMessage: error && error.message ? error.message : null,
      errorCode: error && error.code ? error.code : null,
      errorName: error && error.name ? error.name : null,
      errorString: String(error)
    });
  }
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log("Server started on port " + port);
});
