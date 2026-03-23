require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

/* =========================
   ГЛАВНАЯ СТРАНИЦА
========================= */
app.get("/", (req, res) => {
  res.send(`
    <h1>Betting app is running</h1>
    <ul>
      <li><a href="/db-test">DB test</a></li>
      <li><a href="/init-db">Init DB</a></li>
      <li><a href="/test-register">Register test</a></li>
      <li><a href="/test-login">Login test</a></li>
      <li><a href="/test-bet">Bet test</a></li>
      <li><a href="/test-settle">Settle bet test</a></li>
      <li><a href="/me">My profile</a></li>
      <li><a href="/users">Users</a></li>
      <li><a href="/bets">Bets</a></li>
    </ul>
  `);
});

/* =========================
   DB TEST
========================= */
app.get("/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ ok: true, time: result.rows[0].now });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

/* =========================
   INIT DB
========================= */
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

/* =========================
   REGISTER
========================= */
app.post("/register", async (req, res) => {
  const { email, password } = req.body;

  const result = await pool.query(
    "INSERT INTO users (email, password) VALUES ($1,$2) RETURNING *",
    [email, password]
  );

  res.json({ ok: true, user: result.rows[0] });
});

/* =========================
   LOGIN
========================= */
let currentUser = null;

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const result = await pool.query(
    "SELECT * FROM users WHERE email=$1 AND password=$2",
    [email, password]
  );

  if (result.rows.length === 0) {
    return res.json({ ok: false });
  }

  currentUser = result.rows[0];

  res.json({ ok: true, user: currentUser });
});

/* =========================
   PROFILE
========================= */
app.get("/me", (req, res) => {
  if (!currentUser) {
    return res.send("Not logged in");
  }
  res.json(currentUser);
});

/* =========================
   PLACE BET
========================= */
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

/* =========================
   SETTLE BET
========================= */
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

  await pool.query(
    "UPDATE bets SET status=$1 WHERE id=$2",
    [status, betId]
  );

  if (status === "win") {
    await pool.query(
      "UPDATE users SET balance = balance + $1 WHERE id=$2",
      [bet.possible_win, bet.user_id]
    );
  }

  res.json({ ok: true, message: "Bet settled" });
});

/* =========================
   USERS
========================= */
app.get("/users", async (req, res) => {
  const result = await pool.query("SELECT * FROM users");
  res.json(result.rows);
});

/* =========================
   BETS
========================= */
app.get("/bets", async (req, res) => {
  const result = await pool.query("SELECT * FROM bets");
  res.json(result.rows);
});

/* =========================
   TEST REGISTER PAGE
========================= */
app.get("/test-register", (req, res) => {
  res.send(`
    <h1>Register test</h1>
    <input id="email" placeholder="Email" />
    <input id="password" placeholder="Password" />
    <button onclick="reg()">Register</button>
    <pre id="out"></pre>

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
  `);
});

/* =========================
   TEST LOGIN PAGE
========================= */
app.get("/test-login", (req, res) => {
  res.send(`
    <h1>Login test</h1>
    <input id="email" />
    <input id="password" />
    <button onclick="login()">Login</button>
    <pre id="out"></pre>

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
  `);
});

/* =========================
   TEST BET PAGE
========================= */
app.get("/test-bet", (req, res) => {
  res.send(`
    <h1>Bet test</h1>
    <input id="match" placeholder="Match" />
    <input id="sel" placeholder="Selection" />
    <input id="odds" placeholder="Odds" />
    <input id="stake" placeholder="Stake" />
    <button onclick="bet()">Place bet</button>
    <pre id="out"></pre>

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
  `);
});

/* =========================
   TEST SETTLE PAGE
========================= */
app.get("/test-settle", (req, res) => {
  res.send(`
    <h1>Settle bet test</h1>
    <input id="id" placeholder="Bet ID" />
    <select id="status">
      <option value="win">win</option>
      <option value="lose">lose</option>
    </select>
    <button onclick="settle()">Settle</button>
    <pre id="out"></pre>

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
  `);
});

/* ========================= */
const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Server started"));
