require("dotenv").config();

const express = require("express");
const cors = require("cors");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const pool = require("./db");

const app = express();

const ADMIN_EMAIL = "admin@test.com";

const DAILY_REWARD_BALANCE = 50;
const DAILY_REWARD_XP = 15;

const DAILY_QUEST_REWARDS = {
  quest_bet_1: { balance: 20, xp: 10, title: "Place 1 Bet" },
  quest_bet_3: { balance: 40, xp: 20, title: "Place 3 Bets" },
  quest_daily_reward: { balance: 25, xp: 10, title: "Claim Daily Reward" }
};

const SHOP_ITEMS = [
  { key: "badge_bronze", type: "badge", title: "Bronze Badge", price: 120, icon: "🥉", value: "Bronze" },
  { key: "badge_silver", type: "badge", title: "Silver Badge", price: 220, icon: "🥈", value: "Silver" },
  { key: "badge_gold", type: "badge", title: "Gold Badge", price: 350, icon: "🥇", value: "Gold" },
  { key: "theme_neon", type: "theme", title: "Neon Theme", price: 180, icon: "💜", value: "neon" },
  { key: "theme_fire", type: "theme", title: "Fire Theme", price: 260, icon: "🔥", value: "fire" },
  { key: "theme_ice", type: "theme", title: "Ice Theme", price: 260, icon: "❄️", value: "ice" }
];

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || "secret",
  resave: false,
  saveUninitialized: false
}));

function getLevelInfo(xp) {
  const level = Math.floor((xp || 0) / 100) + 1;
  return { level };
}

async function getUser(req) {
  if (!req.session.userId) return null;

  const result = await pool.query(
    "SELECT * FROM users WHERE id = $1",
    [req.session.userId]
  );

  return result.rows[0] || null;
}

function page(title, content) {
  return `
  <html>
  <head>
    <title>${title}</title>
    <style>
      body { background:#0b1020; color:white; font-family:Arial; padding:20px; }
      .card { background:#18233f; padding:20px; border-radius:12px; margin-bottom:12px; }
      button { padding:10px; border:none; border-radius:8px; cursor:pointer; margin-top:6px; }
      .green{background:#22c55e;} .red{background:#ef4444;}
    </style>
  </head>
  <body>${content}</body>
  </html>`;
}

app.get("/init-db", async (req, res) => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT,
      password TEXT,
      balance NUMERIC DEFAULT 1000,
      xp INT DEFAULT 0,
      last_daily_reward_at TIMESTAMP,
      active_badge TEXT,
      active_theme TEXT DEFAULT 'default'
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS shop_purchases (
      id SERIAL PRIMARY KEY,
      user_id INT,
      item_key TEXT,
      item_type TEXT,
      item_title TEXT,
      price NUMERIC
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bets (
      id SERIAL PRIMARY KEY,
      user_id INT,
      match_name TEXT,
      selection TEXT,
      odds FLOAT,
      stake NUMERIC,
      possible_win NUMERIC,
      status TEXT DEFAULT 'pending'
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS balance_history (
      id SERIAL PRIMARY KEY,
      user_id INT,
      amount NUMERIC,
      type TEXT,
      description TEXT,
      balance_after NUMERIC
    )
  `);

  res.send("DB OK");
});

app.post("/register", async (req, res) => {
  const { email, password } = req.body;
  const hash = await bcrypt.hash(password, 10);

  const r = await pool.query(
    "INSERT INTO users (email,password) VALUES ($1,$2) RETURNING *",
    [email, hash]
  );

  req.session.userId = r.rows[0].id;
  res.json({ ok: true });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const r = await pool.query(
    "SELECT * FROM users WHERE email=$1",
    [email]
  );

  if (!r.rows.length) return res.json({ ok:false });

  const ok = await bcrypt.compare(password, r.rows[0].password);
  if (!ok) return res.json({ ok:false });

  req.session.userId = r.rows[0].id;
  res.json({ ok:true });
});

app.get("/shop", async (req,res)=>{
  const user = await getUser(req);
  if(!user) return res.send("login");

  res.send(page("Shop",`
    <h1>Shop</h1>
    ${SHOP_ITEMS.map(i=>`
      <div class="card">
        <h3>${i.icon} ${i.title}</h3>
        <div>Price: ${i.price}</div>
        <button onclick="buy('${i.key}')">Buy</button>
        <button onclick="equip('${i.key}')">Equip</button>
      </div>
    `).join("")}

    <script>
      async function buy(k){
        await fetch("/buy-shop-item",{method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({itemKey:k})});
        location.reload();
      }
      async function equip(k){
        await fetch("/equip-shop-item",{method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({itemKey:k})});
        location.reload();
      }
    </script>
  `));
});

app.post("/buy-shop-item", async (req,res)=>{
  const user = await getUser(req);
  const item = SHOP_ITEMS.find(i=>i.key===req.body.itemKey);

  if(!item) return res.json({ok:false});

  if(user.balance < item.price)
    return res.json({ok:false});

  await pool.query(
    "UPDATE users SET balance=balance-$1 WHERE id=$2",
    [item.price,user.id]
  );

  await pool.query(
    "INSERT INTO shop_purchases (user_id,item_key,item_type,item_title,price) VALUES ($1,$2,$3,$4,$5)",
    [user.id,item.key,item.type,item.title,item.price]
  );

  res.json({ok:true});
});

app.post("/equip-shop-item", async (req,res)=>{
  const user = await getUser(req);
  const item = SHOP_ITEMS.find(i=>i.key===req.body.itemKey);

  if(item.type==="badge"){
    await pool.query("UPDATE users SET active_badge=$1 WHERE id=$2",
      [item.value,user.id]);
  }

  if(item.type==="theme"){
    await pool.query("UPDATE users SET active_theme=$1 WHERE id=$2",
      [item.value,user.id]);
  }

  res.json({ok:true});
});

app.get("/dashboard", async (req,res)=>{
  const user = await getUser(req);
  if(!user) return res.send("login");

  res.send(page("Dashboard",`
    <h1>Dashboard</h1>

    <div class="card">
      <h2>${user.email}</h2>
      <div>Balance: ${user.balance}</div>
      <div>XP: ${user.xp}</div>
      <div>Level: ${getLevelInfo(user.xp).level}</div>
      <div>Badge: ${user.active_badge||"-"}</div>
      <div>Theme: ${user.active_theme}</div>
    </div>

    <a href="/shop">Go Shop</a>
  `));
});

app.listen(3000,()=>console.log("RUN"));
