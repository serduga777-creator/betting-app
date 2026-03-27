const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

/* ======================
   TEST / HEALTH
====================== */
app.get("/health", (req, res) => {
  res.send("ok");
});

/* ======================
   FAKE USER (демо)
====================== */
let user = {
  id: 1,
  email: "demo@test.com",
  balance: 1000
};

app.get("/me", (req, res) => {
  res.json({
    ok: true,
    user
  });
});

/* ======================
   BETS (демо)
====================== */
let bets = [
  {
    id: 1,
    match_name: "Real Madrid vs Barcelona",
    selection: "Real Madrid win",
    odds: 2.1,
    stake: 10,
    possible_win: 21,
    status: "win"
  },
  {
    id: 2,
    match_name: "Man City vs Liverpool",
    selection: "Man City win",
    odds: 1.9,
    stake: 10,
    possible_win: 19,
    status: "win"
  }
];

app.get("/my-bets", (req, res) => {
  res.json({
    ok: true,
    bets
  });
});

/* ======================
   BALANCE HISTORY
====================== */
let history = [
  {
    id: 1,
    type: "bet_win",
    description: "Win payout",
    amount: 21,
    balance_after: 1021,
    created_at: new Date()
  }
];

app.get("/balance-history", (req, res) => {
  res.json({
    ok: true,
    history
  });
});

/* ======================
   DAILY QUESTS (ГОСТИ)
====================== */
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

/* ======================
   SERVER START
====================== */
const port = process.env.PORT || 3000;

app.listen(port, "0.0.0.0", () => {
  console.log("🚀 Server running on port", port);
  console.log("✅ DAILY GUESTS ENABLED");
});
