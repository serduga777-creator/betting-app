const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

/* HEALTH */
app.get("/health", (req, res) => {
  res.send("ok");
});

/* USER */
app.get("/me", (req, res) => {
  res.json({
    ok: true,
    user: {
      id: 1,
      email: "demo@test.com",
      balance: 1000
    }
  });
});

/* BETS */
app.get("/my-bets", (req, res) => {
  res.json({
    ok: true,
    bets: [
      {
        id: 1,
        match_name: "Real Madrid vs Barcelona",
        selection: "Real Madrid win",
        odds: 2.1,
        stake: 10,
        possible_win: 21,
        status: "win"
      }
    ]
  });
});

/* BALANCE HISTORY */
app.get("/balance-history", (req, res) => {
  res.json({
    ok: true,
    history: [
      {
        id: 1,
        type: "bet_win",
        description: "Win payout",
        amount: 21,
        balance_after: 1021,
        created_at: new Date()
      }
    ]
  });
});

/* DAILY QUESTS */
app.get("/daily-guests", (req, res) => {
  res.json({
    ok: true,
    quests: [
      {
        id: 1,
        title: "Place 1 bet",
        reward: 5,
        done: false
      },
      {
        id: 2,
        title: "Win 1 bet",
        reward: 10,
        done: false
      },
      {
        id: 3,
        title: "Stake 20 total",
        reward: 15,
        done: false
      }
    ]
  });
});

/* START SERVER */
const port = process.env.PORT || 3000;

app.listen(port, "0.0.0.0", () => {
  console.log("Server running on port", port);
});
