require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// тестовый маршрут
app.get("/", (req, res) => {
  res.send("🚀 Betting app is running");
});

// порт (ВАЖНО для Railway)
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log("Server started on port " + port);
});
