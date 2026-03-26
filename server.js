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

const demoMatches = [
  {
    id: 1,
    team1: "Real Madrid",
    team2: "Barcelona",
    league: "La Liga",
    odds: { home: 2.1, draw: 3.5, away: 3.0 }
  },
  {
    id: 2,
    team1: "Man City",
    team2: "Liverpool",
    league: "Premier League",
    odds: { home: 1.9, draw: 3.8, away: 3.4 }
  },
  {
    id: 3,
    team1: "Bayern",
    team2: "Dortmund",
    league: "Bundesliga",
    odds: { home: 1.7, draw: 4.0, away: 4.5 }
  }
];

const SHOP_ITEMS = [
  {
    key: "badge_bronze",
    type: "badge",
    title: "Bronze Badge",
    description: "Simple bronze player badge.",
    price: 120,
    icon: "🥉",
    value: "Bronze"
  },
  {
    key: "badge_silver",
    type: "badge",
    title: "Silver Badge",
    description: "Clean silver player badge.",
    price: 220,
    icon: "🥈",
    value: "Silver"
  },
  {
    key: "badge_gold",
    type: "badge",
    title: "Gold Badge",
    description: "Premium gold player badge.",
    price: 350,
    icon: "🥇",
    value: "Gold"
  },
  {
    key: "theme_neon",
    type: "theme",
    title: "Neon Theme",
    description: "Blue-violet neon profile style.",
    price: 180,
    icon: "💜",
    value: "neon"
  },
  {
    key: "theme_fire",
    type: "theme",
    title: "Fire Theme",
    description: "Hot orange-red profile style.",
    price: 260,
    icon: "🔥",
    value: "fire"
  },
  {
    key: "theme_ice",
    type: "theme",
    title: "Ice Theme",
    description: "Cool blue-white profile style.",
    price: 260,
    icon: "❄️",
    value: "ice"
  }
];

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "super-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      sameSite: "lax"
    }
  })
);

function normalizeStatus(status) {
  return String(status || "pending").trim().toLowerCase();
}

function getDateKey(dateValue) {
  const d = new Date(dateValue);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getLevelInfo(xp) {
  const safeXp = Number(xp || 0);
  const level = Math.floor(safeXp / 100) + 1;
  const currentLevelXp = safeXp % 100;
  const nextLevelXp = 100;
  const percent = Math.min(100, Math.max(0, (currentLevelXp / nextLevelXp) * 100));

  return {
    xp: safeXp,
    level,
    currentLevelXp,
    nextLevelXp,
    percent
  };
}

function getDailyRewardInfo(lastRewardAt) {
  const todayKey = getDateKey(new Date());
  const lastKey = lastRewardAt ? getDateKey(lastRewardAt) : null;
  const canClaim = todayKey !== lastKey;

  return {
    canClaim,
    todayKey,
    lastClaimDate: lastKey
  };
}

function themeStyle(theme) {
  const t = String(theme || "default");

  if (t === "neon") {
    return {
      bg: "linear-gradient(135deg, rgba(59,130,246,0.18), rgba(139,92,246,0.22))",
      border: "1px solid rgba(139,92,246,0.6)"
    };
  }

  if (t === "fire") {
    return {
      bg: "linear-gradient(135deg, rgba(239,68,68,0.18), rgba(249,115,22,0.22))",
      border: "1px solid rgba(249,115,22,0.55)"
    };
  }

  if (t === "ice") {
    return {
      bg: "linear-gradient(135deg, rgba(56,189,248,0.16), rgba(226,232,240,0.14))",
      border: "1px solid rgba(125,211,252,0.55)"
    };
  }

  return {
    bg: "rgba(15, 23, 42, 0.72)",
    border: "1px solid #273449"
  };
}

async function getUser(req) {
  if (!req.session.userId) return null;

  const result = await pool.query(
    "SELECT * FROM users WHERE id = $1 LIMIT 1",
    [req.session.userId]
  );

  if (!result.rows.length) {
    req.session.userId = null;
    return null;
  }

  return result.rows[0];
}

async function getOwnedShopRows(userId) {
  const result = await pool.query(
    "SELECT * FROM shop_purchases WHERE user_id = $1 ORDER BY id DESC",
    [userId]
  );
  return result.rows;
}

async function getShopState(userId) {
  const userResult = await pool.query(
    "SELECT * FROM users WHERE id = $1 LIMIT 1",
    [userId]
  );

  if (!userResult.rows.length) return null;

  const user = userResult.rows[0];
  const purchases = await getOwnedShopRows(userId);
  const ownedKeys = purchases.map(x => x.item_key);

  const items = SHOP_ITEMS.map(item => ({
    ...item,
    owned: ownedKeys.includes(item.key),
    active:
      (item.type === "badge" && user.active_badge === item.value) ||
      (item.type === "theme" && String(user.active_theme || "default") === item.value)
  }));

  return { user, items };
}

async function getUserAchievements(userId) {
  const userResult = await pool.query(
    "SELECT * FROM users WHERE id = $1 LIMIT 1",
    [userId]
  );

  if (!userResult.rows.length) return [];

  const user = userResult.rows[0];

  const betsResult = await pool.query(
    "SELECT * FROM bets WHERE user_id = $1 ORDER BY id DESC",
    [userId]
  );

  const purchasesResult = await pool.query(
    "SELECT * FROM shop_purchases WHERE user_id = $1 ORDER BY id DESC",
    [userId]
  );

  const bets = betsResult.rows;
  const wins = bets.filter(b => normalizeStatus(b.status) === "win").length;
  const totalBets = bets.length;
  const levelInfo = getLevelInfo(user.xp);
  const purchases = purchasesResult.rows;

  return [
    {
      key: "first_bet",
      title: "First Bet",
      description: "Place your first demo bet.",
      icon: "🎯",
      unlocked: totalBets >= 1
    },
    {
      key: "three_bets",
      title: "3 Bets",
      description: "Place at least 3 bets.",
      icon: "🎲",
      unlocked: totalBets >= 3
    },
    {
      key: "first_win",
      title: "First Win",
      description: "Win your first settled bet.",
      icon: "🏅",
      unlocked: wins >= 1
    },
    {
      key: "three_wins",
      title: "3 Wins",
      description: "Reach 3 winning bets.",
      icon: "🏆",
      unlocked: wins >= 3
    },
    {
      key: "level_five",
      title: "Level 5",
      description: "Reach player level 5.",
      icon: "⚡",
      unlocked: levelInfo.level >= 5
    },
    {
      key: "shop_buyer",
      title: "Shop Buyer",
      description: "Buy your first shop item.",
      icon: "🛍️",
      unlocked: purchases.length >= 1
    },
    {
      key: "rich_1200",
      title: "Balance 1200+",
      description: "Reach balance 1200 or more.",
      icon: "💰",
      unlocked: Number(user.balance) >= 1200
    }
  ];
}

async function getDailyQuests(userId) {
  const todayKey = getDateKey(new Date());

  const betsResult = await pool.query(
    "SELECT * FROM bets WHERE user_id = $1 ORDER BY id DESC",
    [userId]
  );

  const historyResult = await pool.query(
    "SELECT * FROM balance_history WHERE user_id = $1 ORDER BY id DESC",
    [userId]
  );

  const betsToday = betsResult.rows.filter(row => {
    if (!row.created_at) return false;
    return getDateKey(row.created_at) === todayKey;
  }).length;

  const claimedDailyRewardToday = historyResult.rows.some(row => {
    if (!row.created_at) return false;
    return row.type === "daily_reward" && getDateKey(row.created_at) === todayKey;
  });

  const questClaimsToday = historyResult.rows.filter(row => {
    if (!row.created_at) return false;
    return row.type === "daily_quest_reward" && getDateKey(row.created_at) === todayKey;
  });

  function isQuestRewardClaimed(questKey) {
    return questClaimsToday.some(row =>
      String(row.description || "").includes(`quest_key=${questKey}`)
    );
  }

  return [
    {
      key: "quest_bet_1",
      title: "Place 1 Bet",
      description: "Place at least 1 bet today.",
      icon: "🎯",
      done: betsToday >= 1,
      progressText: `${Math.min(betsToday, 1)}/1`,
      rewardBalance: DAILY_QUEST_REWARDS.quest_bet_1.balance,
      rewardXp: DAILY_QUEST_REWARDS.quest_bet_1.xp,
      rewardClaimed: isQuestRewardClaimed("quest_bet_1"),
      canClaimReward: betsToday >= 1 && !isQuestRewardClaimed("quest_bet_1")
    },
    {
      key: "quest_bet_3",
      title: "Place 3 Bets",
      description: "Place at least 3 bets today.",
      icon: "🔥",
      done: betsToday >= 3,
      progressText: `${Math.min(betsToday, 3)}/3`,
      rewardBalance: DAILY_QUEST_REWARDS.quest_bet_3.balance,
      rewardXp: DAILY_QUEST_REWARDS.quest_bet_3.xp,
      rewardClaimed: isQuestRewardClaimed("quest_bet_3"),
      canClaimReward: betsToday >= 3 && !isQuestRewardClaimed("quest_bet_3")
    },
    {
      key: "quest_daily_reward",
      title: "Claim Daily Reward",
      description: "Claim today's daily reward.",
      icon: "🎁",
      done: claimedDailyRewardToday,
      progressText: claimedDailyRewardToday ? "1/1" : "0/1",
      rewardBalance: DAILY_QUEST_REWARDS.quest_daily_reward.balance,
      rewardXp: DAILY_QUEST_REWARDS.quest_daily_reward.xp,
      rewardClaimed: isQuestRewardClaimed("quest_daily_reward"),
      canClaimReward: claimedDailyRewardToday && !isQuestRewardClaimed("quest_daily_reward")
    }
  ];
}

function isAdmin(user) {
  return !!user && String(user.email || "").trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

function layout(title, user, content) {
  const levelInfo = user ? getLevelInfo(user.xp) : null;

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <title>${title}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Arial, sans-serif;
        background: linear-gradient(135deg, #0b1020, #111827);
        color: #f3f7ff;
      }
      .container {
        max-width: 1100px;
        margin: 0 auto;
        padding: 16px;
      }
      .topbar, .card {
        background: #18233f;
        border: 1px solid #26324d;
        border-radius: 18px;
        padding: 18px;
        margin-bottom: 16px;
      }
      .top-row, .nav, .row-buttons {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }
      .pill {
        display: inline-block;
        padding: 9px 14px;
        border-radius: 999px;
        background: #1e293b;
        border: 1px solid #334155;
        color: #e2e8f0;
        font-weight: bold;
        font-size: 14px;
      }
      .pill.blue { color: #93c5fd; border-color: rgba(59,130,246,.4); background: rgba(59,130,246,.15); }
      .pill.green { color: #86efac; border-color: rgba(34,197,94,.35); background: rgba(34,197,94,.14); }
      .pill.violet { color: #c4b5fd; border-color: rgba(139,92,246,.4); background: rgba(139,92,246,.14); }

      .nav a {
        text-decoration: none;
        color: #cbd5e1;
        background: #1a2543;
        border: 1px solid #26324d;
        border-radius: 12px;
        padding: 11px 15px;
        font-weight: bold;
      }
      .nav a:hover {
        border-color: #3b82f6;
      }
      .hero {
        background: linear-gradient(135deg, #1d4ed8, #8b5cf6);
        border-radius: 20px;
        padding: 26px;
        margin-bottom: 16px;
      }
      .hero h1 {
        margin: 0 0 10px;
        font-size: 38px;
      }
      .muted {
        color: #94a3b8;
        line-height: 1.6;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 14px;
      }
      .two-cols {
        display: grid;
        grid-template-columns: 1.45fr 1fr;
        gap: 16px;
      }
      .match, .bet-row, .history-row, .user-row, .leader-row, .shop-row, .achievement-row, .quest-row {
        background: rgba(15, 23, 42, 0.72);
        border: 1px solid #273449;
        border-radius: 16px;
        padding: 16px;
        margin-bottom: 12px;
      }
      .league {
        display: inline-block;
        padding: 6px 10px;
        border-radius: 999px;
        background: rgba(139,92,246,0.15);
        border: 1px solid rgba(139,92,246,0.35);
        color: #c4b5fd;
        font-size: 12px;
        font-weight: bold;
        margin-bottom: 10px;
      }
      .teams, .bet-title {
        font-size: 24px;
        font-weight: 800;
        margin-bottom: 8px;
      }
      .odds {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 10px;
        margin-top: 14px;
      }
      .stat-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 12px;
      }
      .stat {
        background: rgba(15, 23, 42, 0.72);
        border: 1px solid #273449;
        border-radius: 16px;
        padding: 16px;
      }
      .stat-label {
        color: #94a3b8;
        margin-bottom: 8px;
      }
      .stat-value {
        font-size: 28px;
        font-weight: 800;
      }
      .slip-selected, .slip-win, .slip-empty {
        background: rgba(15, 23, 42, 0.72);
        border: 1px solid #273449;
        border-radius: 16px;
        padding: 16px;
        margin-bottom: 12px;
      }
      .slip-empty {
        border-style: dashed;
        color: #94a3b8;
        text-align: center;
      }
      .slip-big {
        font-size: 22px;
        font-weight: 800;
        margin-bottom: 6px;
      }
      .slip-win-value {
        font-size: 38px;
        font-weight: 900;
        color: #bfdbfe;
      }
      .status {
        display: inline-block;
        padding: 7px 11px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: bold;
        margin-top: 10px;
        text-transform: uppercase;
      }
      .status.pending {
        background: rgba(245,158,11,.18);
        color: #fbbf24;
        border: 1px solid rgba(245,158,11,.35);
      }
      .status.win {
        background: rgba(34,197,94,.18);
        color: #86efac;
        border: 1px solid rgba(34,197,94,.35);
      }
      .status.lose {
        background: rgba(239,68,68,.18);
        color: #fca5a5;
        border: 1px solid rgba(239,68,68,.35);
      }
      .message {
        display: none;
        margin-top: 12px;
        padding: 12px 14px;
        border-radius: 12px;
        font-weight: bold;
      }
      .message.success {
        display: block;
        background: rgba(34,197,94,.16);
        color: #86efac;
        border: 1px solid rgba(34,197,94,.35);
      }
      .message.error {
        display: block;
        background: rgba(239,68,68,.16);
        color: #fca5a5;
        border: 1px solid rgba(239,68,68,.35);
      }
      .xp-bar-wrap {
        width: 100%;
        height: 14px;
        border-radius: 999px;
        background: #0f172a;
        border: 1px solid #25324a;
        overflow: hidden;
        margin-top: 10px;
      }
      .xp-bar {
        height: 100%;
        background: linear-gradient(90deg, #3b82f6, #8b5cf6);
      }
      .profile-card {
        border-radius: 18px;
        padding: 18px;
        margin-bottom: 16px;
      }
      .shop-icon, .achievement-icon, .quest-icon {
        font-size: 40px;
        margin-bottom: 10px;
      }
      input, button {
        width: 100%;
        padding: 13px 14px;
        border-radius: 12px;
        margin-top: 8px;
        font-size: 16px;
      }
      input {
        border: 1px solid #334155;
        background: #0f172a;
        color: white;
      }
      button {
        border: none;
        color: white;
        font-weight: bold;
        cursor: pointer;
        background: linear-gradient(180deg, #3b82f6, #2563eb);
      }
      button:hover { filter: brightness(1.05); }
      .btn-green { background: linear-gradient(180deg, #22c55e, #16a34a); }
      .btn-red { background: linear-gradient(180deg, #ef4444, #dc2626); }
      .btn-gray { background: linear-gradient(180deg, #475569, #334155); }

      @media (max-width: 900px) {
        .two-cols { grid-template-columns: 1fr; }
        .odds { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="topbar">
        <div class="top-row">
          <div class="pill">🎮 Demo Arena</div>
          <div class="pill ${user ? "blue" : ""}">${user ? "Logged in" : "Guest"}</div>
          ${user ? `<div class="pill">${user.email}</div>` : ""}
          ${user ? `<div class="pill green">Balance: ${user.balance}</div>` : ""}
          ${user ? `<div class="pill violet">Level ${levelInfo.level}</div>` : ""}
          ${user && isAdmin(user) ? `<div class="pill violet">Admin</div>` : ""}
        </div>
      </div>

      <div class="nav">
        <a href="/">Home</a>
        <a href="/register">Register</a>
        <a href="/login">Login</a>
        <a href="/matches">Matches</a>
        <a href="/dashboard">Dashboard</a>
        <a href="/leaderboard">Leaderboard</a>
        <a href="/achievements">Achievements</a>
        <a href="/daily-reward">Daily Reward</a>
        <a href="/daily-quests">Daily Quests</a>
        <a href="/shop">Shop</a>
        <a href="/balance-history">Balance History</a>
        ${user && isAdmin(user) ? `<a href="/admin">Admin</a>` : ""}
        ${user && isAdmin(user) ? `<a href="/users">Users</a>` : ""}
        ${user && isAdmin(user) ? `<a href="/bets">Bets</a>` : ""}
      </div>

      ${content}
    </div>
  </body>
  </html>
  `;
}

function loginRequiredPage(title) {
  return `
    <div class="card">
      <h1>${title}</h1>
      <p class="muted">Please login first to access this page.</p>
      <button onclick="location.href='/login'">Go to login</button>
    </div>
  `;
}

function deniedPage() {
  return `
    <div class="card">
      <h1>Access denied</h1>
      <p class="muted">This page is available only for admin user: <b>${ADMIN_EMAIL}</b></p>
    </div>
  `;
}

app.get("/health", (req, res) => {
  res.send("ok");
});

app.get("/init-db", async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE,
        password TEXT,
        balance NUMERIC DEFAULT 1000,
        xp INT DEFAULT 0,
        last_daily_reward_at TIMESTAMP NULL,
        active_badge TEXT DEFAULT NULL,
        active_theme TEXT DEFAULT 'default',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS xp INT DEFAULT 0
    `);

    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS last_daily_reward_at TIMESTAMP NULL
    `);

    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS active_badge TEXT DEFAULT NULL
    `);

    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS active_theme TEXT DEFAULT 'default'
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS shop_purchases (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        item_key TEXT NOT NULL,
        item_type TEXT NOT NULL,
        item_title TEXT NOT NULL,
        price NUMERIC NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
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
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS balance_history (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        amount NUMERIC NOT NULL,
        type TEXT NOT NULL,
        description TEXT,
        bet_id INT,
        balance_after NUMERIC NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
});

app.get("/", async (req, res) => {
  const user = await getUser(req);

  res.send(layout("Home", user, `
    <div class="hero">
      <h1>Night Arena</h1>
      <p>Dark game-style betting simulator with virtual balance, XP, achievements, daily quests, daily rewards, shop and leaderboard. No real money.</p>
    </div>

    <div class="grid">
      <div class="card">
        <h3>🎯 Prediction gameplay</h3>
        <p class="muted">Pick outcomes, place demo bets and build your profile.</p>
      </div>
      <div class="card">
        <h3>🏆 Achievements</h3>
        <p class="muted">Unlock milestones for wins, levels and activity.</p>
      </div>
      <div class="card">
        <h3>🎁 Daily systems</h3>
        <p class="muted">Claim daily reward and complete daily quests for extra bonuses.</p>
      </div>
    </div>
  `));
});

app.get("/register", async (req, res) => {
  const user = await getUser(req);

  res.send(layout("Register", user, `
    <div class="card">
      <h1>Create account</h1>
      <p class="muted">Create your player profile and start with virtual balance.</p>
      <input id="email" placeholder="Email" />
      <input id="password" type="password" placeholder="Password" />
      <button onclick="registerUser()">Register</button>
      <div id="msg" class="message"></div>
    </div>

    <script>
      function showMessage(text, type) {
        const box = document.getElementById("msg");
        box.className = "message " + type;
        box.style.display = "block";
        box.textContent = text;
      }

      async function registerUser() {
        const res = await fetch("/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            email: document.getElementById("email").value,
            password: document.getElementById("password").value
          })
        });

        const data = await res.json();

        if (!data.ok) {
          showMessage(data.message || "Register failed", "error");
          return;
        }

        showMessage("Account created successfully", "success");
        setTimeout(() => location.href = "/dashboard", 500);
      }
    </script>
  `));
});

app.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.json({ ok: false, message: "Email and password required" });
    }

    const existing = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existing.rows.length) {
      return res.json({ ok: false, message: "User already exists" });
    }

    const hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users (email, password, xp, active_theme) VALUES ($1, $2, 0, 'default') RETURNING *",
      [email, hash]
    );

    req.session.userId = result.rows[0].id;
    res.json({ ok: true, user: result.rows[0] });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
});

app.get("/login", async (req, res) => {
  const user = await getUser(req);

  res.send(layout("Login", user, `
    <div class="card">
      <h1>Login</h1>
      <p class="muted">Enter your account to continue.</p>
      <input id="email" placeholder="Email" />
      <input id="password" type="password" placeholder="Password" />
      <button onclick="loginUser()">Login</button>
      <div id="msg" class="message"></div>
    </div>

    <script>
      function showMessage(text, type) {
        const box = document.getElementById("msg");
        box.className = "message " + type;
        box.style.display = "block";
        box.textContent = text;
      }

      async function loginUser() {
        const res = await fetch("/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            email: document.getElementById("email").value,
            password: document.getElementById("password").value
          })
        });

        const data = await res.json();

        if (!data.ok) {
          showMessage(data.message || "Login failed", "error");
          return;
        }

        showMessage("Login successful", "success");
        setTimeout(() => location.href = "/dashboard", 500);
      }
    </script>
  `));
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1 LIMIT 1",
      [email]
    );

    if (!result.rows.length) {
      return res.json({ ok: false, message: "Invalid credentials" });
    }

    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password);

    if (!ok) {
      return res.json({ ok: false, message: "Invalid credentials" });
    }

    req.session.userId = user.id;
    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
});

app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

app.get("/me", async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.json({ ok: false, message: "Not logged in" });

    const levelInfo = getLevelInfo(user.xp);

    res.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        balance: user.balance,
        xp: user.xp,
        level: levelInfo.level,
        level_progress_percent: levelInfo.percent,
        level_current_xp: levelInfo.currentLevelXp,
        level_next_xp: levelInfo.nextLevelXp,
        active_badge: user.active_badge,
        active_theme: user.active_theme || "default"
      }
    });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
});

app.get("/matches", async (req, res) => {
  const user = await getUser(req);
  if (!user) return res.send(layout("Matches", user, loginRequiredPage("Matches")));

  res.send(layout("Matches", user, `
    <div class="card">
      <h1>Matches</h1>
      <p class="muted">Choose a market, set your stake and place a demo bet.</p>
    </div>

    <div class="two-cols">
      <div class="card">
        <h2>Available matches</h2>

        ${demoMatches.map(match => `
          <div class="match">
            <div class="league">${match.league}</div>
            <div class="teams">${match.team1} vs ${match.team2}</div>
            <div class="muted">Select your outcome below.</div>

            <div class="odds">
              <button onclick="selectBet(${match.id}, 'Home', ${match.odds.home})">
                ${match.team1}<br>${match.odds.home}
              </button>
              <button onclick="selectBet(${match.id}, 'Draw', ${match.odds.draw})">
                Draw<br>${match.odds.draw}
              </button>
              <button onclick="selectBet(${match.id}, 'Away', ${match.odds.away})">
                ${match.team2}<br>${match.odds.away}
              </button>
            </div>
          </div>
        `).join("")}
      </div>

      <div class="card">
        <h2>Bet Slip</h2>

        <div class="stat" style="margin-bottom:12px;">
          <div class="stat-label">Current balance</div>
          <div class="stat-value" id="balanceBox">${user.balance}</div>
        </div>

        <div id="emptySlip" class="slip-empty">
          Pick any outcome to prepare your bet.
        </div>

        <div id="slipContent" style="display:none;">
          <div class="slip-selected">
            <div class="muted">Selected outcome</div>
            <div class="slip-big" id="slipMatch"></div>
            <div class="muted" id="slipSelection" style="margin-bottom:10px;"></div>
            <div><strong>Odds:</strong> <span id="slipOdds"></span></div>
          </div>

          <input id="slipStake" placeholder="Stake" oninput="updateWin()" />

          <div class="slip-win">
            <div class="muted">Potential return</div>
            <div class="slip-win-value" id="possibleWin">0</div>
          </div>

          <button onclick="placeBet()">Place Bet</button>
        </div>

        <div id="msg" class="message"></div>
      </div>
    </div>

    <script>
      const matches = ${JSON.stringify(demoMatches)};
      let selectedBet = null;

      function showMessage(text, type) {
        const box = document.getElementById("msg");
        box.className = "message " + type;
        box.style.display = "block";
        box.textContent = text;
      }

      function selectBet(matchId, selection, odds) {
        const match = matches.find(m => m.id === matchId);

        const selectionText =
          selection === "Home" ? match.team1 + " win" :
          selection === "Away" ? match.team2 + " win" :
          "Draw";

        selectedBet = {
          match_name: match.team1 + " vs " + match.team2,
          selection: selectionText,
          odds: Number(odds)
        };

        document.getElementById("emptySlip").style.display = "none";
        document.getElementById("slipContent").style.display = "block";
        document.getElementById("slipMatch").textContent = selectedBet.match_name;
        document.getElementById("slipSelection").textContent = selectedBet.selection;
        document.getElementById("slipOdds").textContent = selectedBet.odds;
        document.getElementById("slipStake").value = "";
        document.getElementById("possibleWin").textContent = "0";
        document.getElementById("msg").style.display = "none";
      }

      function updateWin() {
        if (!selectedBet) return;
        const stake = Number(document.getElementById("slipStake").value || 0);
        const value = stake * selectedBet.odds;
        document.getElementById("possibleWin").textContent = value ? value : 0;
      }

      async function placeBet() {
        if (!selectedBet) return;

        const stake = Number(document.getElementById("slipStake").value || 0);

        const res = await fetch("/place-bet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            match_name: selectedBet.match_name,
            selection: selectedBet.selection,
            odds: selectedBet.odds,
            stake
          })
        });

        const data = await res.json();

        if (!data.ok) {
          showMessage(data.message || "Could not place bet", "error");
          return;
        }

        document.getElementById("balanceBox").textContent = data.newBalance;
        document.getElementById("slipStake").value = "";
        document.getElementById("possibleWin").textContent = "0";
        showMessage("Bet placed successfully", "success");
      }
    </script>
  `));
});

app.post("/place-bet", async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.json({ ok: false, message: "Not logged in" });

    const { match_name, selection, odds, stake } = req.body;

    if (!match_name || !selection || !odds || !stake) {
      return res.json({ ok: false, message: "Missing bet data" });
    }

    if (Number(stake) <= 0) {
      return res.json({ ok: false, message: "Invalid stake" });
    }

    if (Number(user.balance) < Number(stake)) {
      return res.json({ ok: false, message: "Not enough balance" });
    }

    const possibleWin = Number(odds) * Number(stake);
    const newBalance = Number(user.balance) - Number(stake);
    const xpGain = 10;

    await pool.query(
      "UPDATE users SET balance = balance - $1, xp = COALESCE(xp, 0) + $2 WHERE id = $3",
      [stake, xpGain, user.id]
    );

    const betResult = await pool.query(
      `INSERT INTO bets (user_id, match_name, selection, odds, stake, possible_win)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [user.id, match_name, selection, odds, stake, possibleWin]
    );

    await pool.query(
      `INSERT INTO balance_history (user_id, amount, type, description, bet_id, balance_after)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        user.id,
        -Math.abs(Number(stake)),
        "bet_stake",
        `Stake for ${match_name} / ${selection}`,
        betResult.rows[0].id,
        newBalance
      ]
    );

    const updatedUserResult = await pool.query(
      "SELECT * FROM users WHERE id = $1",
      [user.id]
    );

    const updatedUser = updatedUserResult.rows[0];
    const levelInfo = getLevelInfo(updatedUser.xp);

    res.json({
      ok: true,
      bet: betResult.rows[0],
      newBalance,
      xpGain,
      xp: updatedUser.xp,
      level: levelInfo.level
    });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
});

app.get("/dashboard", async (req, res) => {
  const user = await getUser(req);
  if (!user) return res.send(layout("Dashboard", user, loginRequiredPage("Dashboard")));

  res.send(layout("Dashboard", user, `
    <div class="card">
      <h1>Player Dashboard</h1>
      <p class="muted">Track your level, XP, balance, style and betting performance.</p>
      <div class="row-buttons">
        <button onclick="loadDashboard()">Refresh Dashboard</button>
        <button class="btn-gray" onclick="logoutNow()">Logout</button>
      </div>
      <div id="dashMsg" class="message"></div>
    </div>

    <div id="dashboardContent" class="card">Loading...</div>

    <script>
      async function logoutNow() {
        await fetch("/logout", {
          method: "POST",
          credentials: "include"
        });
        location.href = "/login";
      }

      function showDashError(text) {
        const box = document.getElementById("dashMsg");
        box.className = "message error";
        box.style.display = "block";
        box.textContent = text;
      }

      function normalizeStatus(status) {
        return String(status || "").trim().toLowerCase();
      }

      function getThemeStyles(theme) {
        const t = String(theme || "default");

        if (t === "neon") {
          return {
            bg: "linear-gradient(135deg, rgba(59,130,246,0.18), rgba(139,92,246,0.22))",
            border: "1px solid rgba(139,92,246,0.6)"
          };
        }

        if (t === "fire") {
          return {
            bg: "linear-gradient(135deg, rgba(239,68,68,0.18), rgba(249,115,22,0.22))",
            border: "1px solid rgba(249,115,22,0.55)"
          };
        }

        if (t === "ice") {
          return {
            bg: "linear-gradient(135deg, rgba(56,189,248,0.16), rgba(226,232,240,0.14))",
            border: "1px solid rgba(125,211,252,0.55)"
          };
        }

        return {
          bg: "rgba(15, 23, 42, 0.72)",
          border: "1px solid #273449"
        };
      }

      async function loadDashboard() {
        try {
          const meRes = await fetch("/me", { credentials: "include", cache: "no-store" });
          const meData = await meRes.json();

          if (!meData.ok) {
            location.href = "/login";
            return;
          }

          const betsRes = await fetch("/api/my-bets", { credentials: "include", cache: "no-store" });
          const betsData = await betsRes.json();

          const historyRes = await fetch("/api/balance-history", { credentials: "include", cache: "no-store" });
          const historyData = await historyRes.json();

          if (!betsData.ok) throw new Error(betsData.message || "Could not load bets");
          if (!historyData.ok) throw new Error(historyData.message || "Could not load history");

          const bets = betsData.bets || [];
          const history = historyData.history || [];

          const pending = bets.filter(b => normalizeStatus(b.status) === "pending").length;
          const wins = bets.filter(b => normalizeStatus(b.status) === "win").length;
          const loses = bets.filter(b => normalizeStatus(b.status) === "lose").length;

          const totalStaked = bets.reduce((sum, b) => sum + Number(b.stake || 0), 0);
          const totalWon = history.filter(h => h.type === "bet_win").reduce((sum, h) => sum + Number(h.amount || 0), 0);
          const totalReward = history.filter(h => h.type === "daily_reward").reduce((sum, h) => sum + Number(h.amount || 0), 0);
          const totalQuestReward = history.filter(h => h.type === "daily_quest_reward").reduce((sum, h) => sum + Number(h.amount || 0), 0);
          const totalShopSpend = history.filter(h => h.type === "shop_purchase").reduce((sum, h) => sum + Math.abs(Number(h.amount || 0)), 0);

          const profit = totalWon + totalReward + totalQuestReward - totalStaked - totalShopSpend;
          const theme = getThemeStyles(meData.user.active_theme);

          document.getElementById("dashboardContent").innerHTML = \`
            <div class="profile-card" style="background:\${theme.bg}; border:\${theme.border};">
              <div class="muted" style="margin-bottom:8px;">PROFILE CARD</div>
              <div style="font-size:24px; font-weight:800; margin-bottom:8px;">\${meData.user.email}</div>
              <div class="row-buttons">
                <span class="pill violet">Level \${meData.user.level}</span>
                <span class="pill blue">XP \${meData.user.xp}</span>
                <span class="pill">Theme: \${meData.user.active_theme}</span>
                \${meData.user.active_badge ? '<span class="pill green">Badge: ' + meData.user.active_badge + '</span>' : ''}
              </div>
            </div>

            <h2>Profile</h2>

            <div class="stat-grid" style="margin-bottom:16px;">
              <div class="stat">
                <div class="stat-label">Email</div>
                <div class="stat-value" style="font-size:18px;">\${meData.user.email}</div>
              </div>
              <div class="stat">
                <div class="stat-label">Balance</div>
                <div class="stat-value">\${meData.user.balance}</div>
              </div>
              <div class="stat">
                <div class="stat-label">Level</div>
                <div class="stat-value">\${meData.user.level}</div>
              </div>
              <div class="stat">
                <div class="stat-label">XP</div>
                <div class="stat-value">\${meData.user.xp}</div>
              </div>
            </div>

            <div class="card" style="padding:16px; margin-bottom:16px;">
              <div style="font-size:18px; font-weight:800; margin-bottom:4px;">XP Progress</div>
              <div class="muted">\${meData.user.level_current_xp} / \${meData.user.level_next_xp} XP to next level</div>
              <div class="xp-bar-wrap">
                <div class="xp-bar" style="width:\${meData.user.level_progress_percent}%"></div>
              </div>
            </div>

            <h2>Stats</h2>
            <div class="stat-grid">
              <div class="stat"><div class="stat-label">Total bets</div><div class="stat-value">\${bets.length}</div></div>
              <div class="stat"><div class="stat-label">Pending</div><div class="stat-value">\${pending}</div></div>
              <div class="stat"><div class="stat-label">Wins</div><div class="stat-value">\${wins}</div></div>
              <div class="stat"><div class="stat-label">Loses</div><div class="stat-value">\${loses}</div></div>
              <div class="stat"><div class="stat-label">Quest rewards</div><div class="stat-value">\${totalQuestReward}</div></div>
              <div class="stat"><div class="stat-label">Profit</div><div class="stat-value">\${profit}</div></div>
            </div>

            <h2 style="margin-top:22px;">My Bets</h2>
            \${bets.length === 0 ? "<p class='muted'>No bets yet.</p>" : bets.map(b => {
              const s = normalizeStatus(b.status);
              return \`
                <div class="bet-row">
                  <div class="bet-title">\${b.match_name}</div>
                  <div class="muted">Selection: \${b.selection}</div>
                  <div><strong>ID:</strong> \${b.id}</div>
                  <div><strong>Odds:</strong> \${b.odds}</div>
                  <div><strong>Stake:</strong> \${b.stake}</div>
                  <div><strong>Possible win:</strong> \${b.possible_win}</div>
                  <div><span class="status \${s}">\${s}</span></div>
                </div>
              \`;
            }).join("")}
          \`;
        } catch (err) {
          showDashError(err.message || "Dashboard loading failed");
          document.getElementById("dashboardContent").innerHTML = "<p class='muted'>Could not load dashboard.</p>";
        }
      }

      loadDashboard();
    </script>
  `));
});

app.get("/api/my-bets", async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.json({ ok: false, message: "Not logged in" });

    const result = await pool.query(
      "SELECT * FROM bets WHERE user_id = $1 ORDER BY id DESC",
      [user.id]
    );

    res.json({ ok: true, bets: result.rows });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
});

app.get("/achievements", async (req, res) => {
  const user = await getUser(req);
  if (!user) return res.send(layout("Achievements", user, loginRequiredPage("Achievements")));

  res.send(layout("Achievements", user, `
    <div class="card">
      <h1>Achievements</h1>
      <p class="muted">Unlock milestones and build your player identity.</p>
      <button onclick="loadAchievements()">Refresh Achievements</button>
    </div>

    <div id="achievementsBox" class="card">Loading...</div>

    <script>
      async function loadAchievements() {
        const res = await fetch("/api/achievements", {
          credentials: "include",
          cache: "no-store"
        });

        const data = await res.json();

        if (!data.ok) {
          document.getElementById("achievementsBox").innerHTML = "<p class='muted'>Could not load achievements.</p>";
          return;
        }

        const items = data.achievements || [];
        const unlocked = items.filter(x => x.unlocked).length;

        document.getElementById("achievementsBox").innerHTML = \`
          <h2>Unlocked: \${unlocked} / \${items.length}</h2>
          \${items.map(item => \`
            <div class="achievement-row" style="opacity:\${item.unlocked ? 1 : 0.55}">
              <div class="achievement-icon">\${item.icon}</div>
              <div style="font-size:18px; font-weight:800; margin-bottom:6px;">\${item.title}</div>
              <div class="muted">\${item.description}</div>
              <div style="margin-top:10px;">
                \${item.unlocked
                  ? '<span class="pill green">UNLOCKED</span>'
                  : '<span class="pill">LOCKED</span>'}
              </div>
            </div>
          \`).join("")}
        \`;
      }

      loadAchievements();
    </script>
  `));
});

app.get("/api/achievements", async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.json({ ok: false, message: "Not logged in" });

    const achievements = await getUserAchievements(user.id);

    res.json({
      ok: true,
      achievements
    });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
});

app.get("/daily-reward", async (req, res) => {
  const user = await getUser(req);
  if (!user) return res.send(layout("Daily Reward", user, loginRequiredPage("Daily Reward")));

  res.send(layout("Daily Reward", user, `
    <div class="card">
      <h1>Daily Reward</h1>
      <p class="muted">Claim your daily bonus once per day.</p>
      <div id="rewardContent">Loading...</div>
    </div>

    <script>
      async function loadReward() {
        const res = await fetch("/api/daily-reward-status", {
          credentials: "include",
          cache: "no-store"
        });

        const data = await res.json();

        if (!data.ok) {
          document.getElementById("rewardContent").innerHTML = "<p class='muted'>Could not load reward status.</p>";
          return;
        }

        document.getElementById("rewardContent").innerHTML = \`
          <div class="stat" style="margin-bottom:12px;">
            <div class="stat-label">Reward</div>
            <div class="stat-value">+\${data.rewardBalance}</div>
            <div class="muted">+\${data.rewardXp} XP</div>
          </div>

          <div class="muted">Last claim: \${data.lastClaimDate || "never"}</div>

          \${data.canClaim
            ? '<button class="btn-green" onclick="claimReward()">Claim reward</button>'
            : '<div class="message success" style="display:block;">Reward already claimed today</div>'}
        \`;
      }

      async function claimReward() {
        const res = await fetch("/claim-daily-reward", {
          method: "POST",
          credentials: "include"
        });

        const data = await res.json();

        if (!data.ok) {
          document.getElementById("rewardContent").innerHTML += '<div class="message error" style="display:block;">' + (data.message || "Could not claim reward") + '</div>';
          return;
        }

        document.getElementById("rewardContent").innerHTML = \`
          <div class="message success" style="display:block;">
            Claimed: +\${data.rewardBalance} balance and +\${data.rewardXp} XP
          </div>
          <div class="muted" style="margin-top:12px;">New balance: \${data.balance}</div>
          <div class="muted">New XP: \${data.xp}</div>
          <div class="muted">Level: \${data.level}</div>
        \`;
      }

      loadReward();
    </script>
  `));
});

app.get("/api/daily-reward-status", async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.json({ ok: false, message: "Not logged in" });

    const rewardInfo = getDailyRewardInfo(user.last_daily_reward_at);
    const levelInfo = getLevelInfo(user.xp);

    res.json({
      ok: true,
      canClaim: rewardInfo.canClaim,
      todayKey: rewardInfo.todayKey,
      lastClaimDate: rewardInfo.lastClaimDate,
      rewardBalance: DAILY_REWARD_BALANCE,
      rewardXp: DAILY_REWARD_XP,
      balance: user.balance,
      xp: user.xp,
      level: levelInfo.level
    });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
});

app.post("/claim-daily-reward", async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.json({ ok: false, message: "Not logged in" });

    const rewardInfo = getDailyRewardInfo(user.last_daily_reward_at);

    if (!rewardInfo.canClaim) {
      return res.json({ ok: false, message: "Daily reward already claimed today" });
    }

    await pool.query(
      `UPDATE users
       SET balance = balance + $1,
           xp = COALESCE(xp, 0) + $2,
           last_daily_reward_at = NOW()
       WHERE id = $3`,
      [DAILY_REWARD_BALANCE, DAILY_REWARD_XP, user.id]
    );

    const updatedResult = await pool.query(
      "SELECT * FROM users WHERE id = $1 LIMIT 1",
      [user.id]
    );

    const updatedUser = updatedResult.rows[0];
    const newBalance = Number(updatedUser.balance);
    const levelInfo = getLevelInfo(updatedUser.xp);

    await pool.query(
      `INSERT INTO balance_history (user_id, amount, type, description, bet_id, balance_after)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        user.id,
        DAILY_REWARD_BALANCE,
        "daily_reward",
        `Daily reward claimed (+${DAILY_REWARD_BALANCE} balance, +${DAILY_REWARD_XP} XP)`,
        null,
        newBalance
      ]
    );

    res.json({
      ok: true,
      message: "Daily reward claimed",
      rewardBalance: DAILY_REWARD_BALANCE,
      rewardXp: DAILY_REWARD_XP,
      balance: updatedUser.balance,
      xp: updatedUser.xp,
      level: levelInfo.level
    });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
});

app.get("/daily-quests", async (req, res) => {
  const user = await getUser(req);
  if (!user) return res.send(layout("Daily Quests", user, loginRequiredPage("Daily Quests")));

  res.send(layout("Daily Quests", user, `
    <div class="card">
      <h1>Daily Quests</h1>
      <p class="muted">Complete quests and claim extra daily bonuses.</p>
      <button onclick="loadQuests()">Refresh Quests</button>
      <div id="questMsg" class="message"></div>
    </div>

    <div id="questsBox" class="card">Loading...</div>

    <script>
      function showQuestMessage(text, type) {
        const box = document.getElementById("questMsg");
        box.className = "message " + type;
        box.style.display = "block";
        box.textContent = text;
      }

      async function loadQuests() {
        const res = await fetch("/api/daily-quests", {
          credentials: "include",
          cache: "no-store"
        });

        const data = await res.json();

        if (!data.ok) {
          document.getElementById("questsBox").innerHTML = "<p class='muted'>Could not load daily quests.</p>";
          return;
        }

        const quests = data.quests || [];

        document.getElementById("questsBox").innerHTML = \`
          <h2>Completed: \${data.completed} / \${data.total}</h2>
          \${quests.map(item => \`
            <div class="quest-row" style="opacity:\${item.done ? 1 : 0.7}">
              <div class="quest-icon">\${item.icon}</div>
              <div style="font-size:18px; font-weight:800; margin-bottom:6px;">\${item.title}</div>
              <div class="muted">\${item.description}</div>
              <div class="muted" style="margin-top:8px;">Progress: \${item.progressText}</div>
              <div class="muted">Reward: +\${item.rewardBalance} balance / +\${item.rewardXp} XP</div>
              <div style="margin-top:10px;">
                \${item.rewardClaimed
                  ? '<span class="pill green">REWARD CLAIMED</span>'
                  : item.canClaimReward
                    ? '<button class="btn-green" onclick="claimQuestReward(\\'' + item.key + '\\')">Claim reward</button>'
                    : item.done
                      ? '<span class="pill blue">READY</span>'
                      : '<span class="pill">IN PROGRESS</span>'}
              </div>
            </div>
          \`).join("")}
        \`;
      }

      async function claimQuestReward(questKey) {
        const res = await fetch("/claim-daily-quest-reward", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ questKey })
        });

        const data = await res.json();

        if (!data.ok) {
          showQuestMessage(data.message || "Could not claim quest reward", "error");
          return;
        }

        showQuestMessage("Quest reward claimed: +" + data.rewardBalance + " balance and +" + data.rewardXp + " XP", "success");
        loadQuests();
      }

      loadQuests();
    </script>
  `));
});

app.get("/api/daily-quests", async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.json({ ok: false, message: "Not logged in" });

    const quests = await getDailyQuests(user.id);
    const completed = quests.filter(q => q.done).length;

    res.json({
      ok: true,
      quests,
      completed,
      total: quests.length
    });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
});

app.post("/claim-daily-quest-reward", async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.json({ ok: false, message: "Not logged in" });

    const { questKey } = req.body;
    if (!questKey || !DAILY_QUEST_REWARDS[questKey]) {
      return res.json({ ok: false, message: "Invalid quest key" });
    }

    const quests = await getDailyQuests(user.id);
    const quest = quests.find(q => q.key === questKey);

    if (!quest) {
      return res.json({ ok: false, message: "Quest not found" });
    }

    if (!quest.done) {
      return res.json({ ok: false, message: "Quest is not completed yet" });
    }

    if (quest.rewardClaimed) {
      return res.json({ ok: false, message: "Quest reward already claimed today" });
    }

    const reward = DAILY_QUEST_REWARDS[questKey];

    await pool.query(
      "UPDATE users SET balance = balance + $1, xp = COALESCE(xp, 0) + $2 WHERE id = $3",
      [reward.balance, reward.xp, user.id]
    );

    const updatedUserResult = await pool.query(
      "SELECT * FROM users WHERE id = $1 LIMIT 1",
      [user.id]
    );

    const updatedUser = updatedUserResult.rows[0];
    const newBalance = Number(updatedUser.balance);
    const levelInfo = getLevelInfo(updatedUser.xp);

    await pool.query(
      `INSERT INTO balance_history (user_id, amount, type, description, bet_id, balance_after)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        user.id,
        reward.balance,
        "daily_quest_reward",
        `Daily quest reward claimed: ${reward.title} | quest_key=${questKey} | +${reward.balance} balance +${reward.xp} XP`,
        null,
        newBalance
      ]
    );

    res.json({
      ok: true,
      message: "Quest reward claimed",
      questKey,
      rewardBalance: reward.balance,
      rewardXp: reward.xp,
      balance: updatedUser.balance,
      xp: updatedUser.xp,
      level: levelInfo.level
    });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
});

app.get("/shop", async (req, res) => {
  const user = await getUser(req);
  if (!user) return res.send(layout("Shop", user, loginRequiredPage("Shop")));

  res.send(layout("Shop", user, `
    <div class="card">
      <h1>Shop</h1>
      <p class="muted">Buy badges and profile themes using virtual balance.</p>
      <button onclick="loadShop()">Refresh Shop</button>
      <div id="shopMsg" class="message"></div>
    </div>

    <div id="shopContent" class="card">Loading...</div>

    <script>
      function showShopMessage(text, type) {
        const box = document.getElementById("shopMsg");
        box.className = "message " + type;
        box.style.display = "block";
        box.textContent = text;
      }

      async function buyItem(itemKey) {
        const res = await fetch("/buy-shop-item", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ itemKey })
        });

        const data = await res.json();

        if (!data.ok) {
          showShopMessage(data.message || "Could not buy item", "error");
          return;
        }

        showShopMessage("Item purchased successfully", "success");
        loadShop();
      }

      async function equipItem(itemKey) {
        const res = await fetch("/equip-shop-item", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ itemKey })
        });

        const data = await res.json();

        if (!data.ok) {
          showShopMessage(data.message || "Could not equip item", "error");
          return;
        }

        showShopMessage("Item equipped", "success");
        loadShop();
      }

      async function loadShop() {
        const res = await fetch("/api/shop", {
          credentials: "include",
          cache: "no-store"
        });

        const data = await res.json();

        if (!data.ok) {
          document.getElementById("shopContent").innerHTML = "<p class='muted'>Could not load shop.</p>";
          return;
        }

        const items = data.items || [];

        document.getElementById("shopContent").innerHTML = \`
          <h2>Balance: \${data.balance}</h2>

          <div class="grid">
            \${items.map(item => \`
              <div class="shop-row">
                <div class="shop-icon">\${item.icon}</div>
                <h3>\${item.title}</h3>
                <div class="muted">\${item.description}</div>
                <div class="muted" style="margin-top:8px;">Type: \${item.type}</div>
                <div class="muted">Price: \${item.price}</div>

                \${item.active
                  ? '<div class="message success" style="display:block; margin-top:12px;">ACTIVE</div>'
                  : item.owned
                    ? '<button class="btn-green" onclick="equipItem(\\'' + item.key + '\\')">Equip</button>'
                    : '<button onclick="buyItem(\\'' + item.key + '\\')">Buy</button>'}
              </div>
            \`).join("")}
          </div>
        \`;
      }

      loadShop();
    </script>
  `));
});

app.get("/api/shop", async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.json({ ok: false, message: "Not logged in" });

    const state = await getShopState(user.id);
    if (!state) return res.json({ ok: false, message: "User not found" });

    res.json({
      ok: true,
      balance: state.user.balance,
      active_badge: state.user.active_badge,
      active_theme: state.user.active_theme || "default",
      items: state.items
    });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
});

app.post("/buy-shop-item", async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.json({ ok: false, message: "Not logged in" });

    const { itemKey } = req.body;
    const item = SHOP_ITEMS.find(x => x.key === itemKey);

    if (!item) {
      return res.json({ ok: false, message: "Item not found" });
    }

    const ownedResult = await pool.query(
      "SELECT id FROM shop_purchases WHERE user_id = $1 AND item_key = $2 LIMIT 1",
      [user.id, item.key]
    );

    if (ownedResult.rows.length) {
      return res.json({ ok: false, message: "Item already owned" });
    }

    const freshUserResult = await pool.query(
      "SELECT * FROM users WHERE id = $1 LIMIT 1",
      [user.id]
    );

    const freshUser = freshUserResult.rows[0];

    if (Number(freshUser.balance) < Number(item.price)) {
      return res.json({ ok: false, message: "Not enough balance" });
    }

    await pool.query(
      "UPDATE users SET balance = balance - $1 WHERE id = $2",
      [item.price, user.id]
    );

    await pool.query(
      `INSERT INTO shop_purchases (user_id, item_key, item_type, item_title, price)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, item.key, item.type, item.title, item.price]
    );

    const updatedUserResult = await pool.query(
      "SELECT * FROM users WHERE id = $1 LIMIT 1",
      [user.id]
    );

    const updatedUser = updatedUserResult.rows[0];

    await pool.query(
      `INSERT INTO balance_history (user_id, amount, type, description, bet_id, balance_after)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        user.id,
        -Math.abs(Number(item.price)),
        "shop_purchase",
        `Shop purchase: ${item.title}`,
        null,
        Number(updatedUser.balance)
      ]
    );

    res.json({
      ok: true,
      message: "Item purchased",
      balance: updatedUser.balance
    });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
});

app.post("/equip-shop-item", async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.json({ ok: false, message: "Not logged in" });

    const { itemKey } = req.body;
    const item = SHOP_ITEMS.find(x => x.key === itemKey);

    if (!item) {
      return res.json({ ok: false, message: "Item not found" });
    }

    const ownedResult = await pool.query(
      "SELECT id FROM shop_purchases WHERE user_id = $1 AND item_key = $2 LIMIT 1",
      [user.id, item.key]
    );

    if (!ownedResult.rows.length) {
      return res.json({ ok: false, message: "You do not own this item" });
    }

    if (item.type === "badge") {
      await pool.query(
        "UPDATE users SET active_badge = $1 WHERE id = $2",
        [item.value, user.id]
      );
    }

    if (item.type === "theme") {
      await pool.query(
        "UPDATE users SET active_theme = $1 WHERE id = $2",
        [item.value, user.id]
      );
    }

    const updatedUserResult = await pool.query(
      "SELECT * FROM users WHERE id = $1 LIMIT 1",
      [user.id]
    );

    const updatedUser = updatedUserResult.rows[0];

    res.json({
      ok: true,
      message: "Item equipped",
      active_badge: updatedUser.active_badge,
      active_theme: updatedUser.active_theme || "default"
    });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
});

app.get("/balance-history", async (req, res) => {
  const user = await getUser(req);
  if (!user) return res.send(layout("Balance History", user, loginRequiredPage("Balance History")));

  res.send(layout("Balance History", user, `
    <div class="card">
      <h1>Balance History</h1>
      <p class="muted">All balance movements: stakes, payouts, rewards and shop purchases.</p>
      <div id="historyBox">Loading...</div>
    </div>

    <script>
      async function loadHistory() {
        const res = await fetch("/api/balance-history", {
          credentials: "include",
          cache: "no-store"
        });

        const data = await res.json();

        if (!data.ok) {
          document.getElementById("historyBox").innerHTML = "<p class='muted'>Could not load history.</p>";
          return;
        }

        const rows = data.history || [];

        document.getElementById("historyBox").innerHTML =
          rows.length === 0
            ? "<p class='muted'>No balance changes yet.</p>"
            : rows.map(r => \`
              <div class="history-row">
                <div><strong>Type:</strong> \${r.type}</div>
                <div><strong>Description:</strong> \${r.description || "-"}</div>
                <div><strong>Bet ID:</strong> \${r.bet_id || "-"}</div>
                <div><strong>Amount:</strong> \${r.amount}</div>
                <div><strong>Balance after:</strong> \${r.balance_after}</div>
                <div><strong>Created:</strong> \${r.created_at}</div>
              </div>
            \`).join("");
      }

      loadHistory();
    </script>
  `));
});

app.get("/api/balance-history", async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.json({ ok: false, message: "Not logged in" });

    const result = await pool.query(
      "SELECT * FROM balance_history WHERE user_id = $1 ORDER BY id DESC",
      [user.id]
    );

    res.json({ ok: true, history: result.rows });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
});

app.get("/leaderboard", async (req, res) => {
  const user = await getUser(req);

  res.send(layout("Leaderboard", user, `
    <div class="card">
      <h1>Leaderboard</h1>
      <p class="muted">Top players by XP and balance.</p>
      <div id="leaders">Loading...</div>
    </div>

    <script>
      function medal(rank) {
        if (rank === 1) return "🥇";
        if (rank === 2) return "🥈";
        if (rank === 3) return "🥉";
        return "#" + rank;
      }

      async function loadLeaders() {
        const res = await fetch("/api/leaderboard", {
          credentials: "include",
          cache: "no-store"
        });

        const data = await res.json();

        if (!data.ok) {
          document.getElementById("leaders").innerHTML = "<p class='muted'>Could not load leaderboard.</p>";
          return;
        }

        const players = data.players || [];

        document.getElementById("leaders").innerHTML =
          players.length === 0
            ? "<p class='muted'>No players yet.</p>"
            : players.map(player => \`
              <div class="leader-row">
                <div><strong>\${medal(player.rank)}</strong></div>
                <div><strong>\${player.email}</strong></div>
                <div>Level: \${player.level}</div>
                <div>XP: \${player.xp}</div>
                <div>Balance: \${player.balance}</div>
              </div>
            \`).join("");
      }

      loadLeaders();
    </script>
  `));
});

app.get("/api/leaderboard", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, email, balance, xp, created_at FROM users ORDER BY xp DESC, balance DESC, id ASC LIMIT 50"
    );

    const players = result.rows.map((row, index) => ({
      rank: index + 1,
      id: row.id,
      email: row.email,
      balance: row.balance,
      xp: row.xp || 0,
      level: getLevelInfo(row.xp).level,
      created_at: row.created_at
    }));

    res.json({ ok: true, players });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
});

app.get("/admin", async (req, res) => {
  const user = await getUser(req);
  if (!user) return res.send(layout("Admin", user, loginRequiredPage("Admin")));
  if (!isAdmin(user)) return res.send(layout("Admin", user, deniedPage()));

  res.send(layout("Admin", user, `
    <div class="card">
      <h1>Admin Panel</h1>
      <p class="muted">Settle pending bets.</p>
      <button onclick="loadBets()">Refresh Bets</button>
      <div id="msg" class="message"></div>
    </div>

    <div id="betsBox" class="card">Loading...</div>

    <script>
      function showMessage(text, type) {
        const box = document.getElementById("msg");
        box.className = "message " + type;
        box.style.display = "block";
        box.textContent = text;
      }

      function normalizeStatus(status) {
        return String(status || "").trim().toLowerCase();
      }

      function statusBadge(status) {
        const s = normalizeStatus(status);
        return '<span class="status ' + s + '">' + s + '</span>';
      }

      async function settleBet(betId, status) {
        const res = await fetch("/settle-bet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ betId, status })
        });

        const data = await res.json();

        if (!data.ok) {
          showMessage(data.message || "Settle failed", "error");
          return;
        }

        showMessage("Bet #" + betId + " settled", "success");
        loadBets();
      }

      async function loadBets() {
        const res = await fetch("/bets?format=json", {
          credentials: "include",
          cache: "no-store"
        });

        const data = await res.json();

        if (!data.ok) {
          document.getElementById("betsBox").innerHTML = "<p class='muted'>Error loading bets</p>";
          return;
        }

        const bets = data.bets || [];

        document.getElementById("betsBox").innerHTML =
          bets.length === 0
            ? "<p class='muted'>No bets yet.</p>"
            : bets.map(bet => {
                const s = normalizeStatus(bet.status);
                return \`
                  <div class="bet-row">
                    <div class="bet-title">\${bet.match_name}</div>
                    <div class="muted">Selection: \${bet.selection}</div>
                    <div><strong>ID:</strong> \${bet.id}</div>
                    <div><strong>User:</strong> \${bet.email || bet.user_id}</div>
                    <div><strong>Odds:</strong> \${bet.odds}</div>
                    <div><strong>Stake:</strong> \${bet.stake}</div>
                    <div><strong>Possible win:</strong> \${bet.possible_win}</div>
                    <div>\${statusBadge(s)}</div>
                    <div class="row-buttons">
                      \${s === "pending"
                        ? '<button class="btn-green" onclick="settleBet(' + bet.id + ', \\'win\\')">WIN</button><button class="btn-red" onclick="settleBet(' + bet.id + ', \\'lose\\')">LOSE</button>'
                        : ""}
                    </div>
                  </div>
                \`;
              }).join("");
      }

      loadBets();
    </script>
  `));
});

app.post("/settle-bet", async (req, res) => {
  try {
    const admin = await getUser(req);

    if (!isAdmin(admin)) {
      return res.json({ ok: false, message: "Admin access required" });
    }

    const { betId, status } = req.body;

    if (status !== "win" && status !== "lose") {
      return res.json({ ok: false, message: "Invalid status" });
    }

    const betResult = await pool.query(
      "SELECT * FROM bets WHERE id = $1",
      [betId]
    );

    if (!betResult.rows.length) {
      return res.json({ ok: false, message: "Bet not found" });
    }

    const bet = betResult.rows[0];

    if (normalizeStatus(bet.status) !== "pending") {
      return res.json({ ok: false, message: "Bet already settled" });
    }

    await pool.query(
      "UPDATE bets SET status = $1 WHERE id = $2",
      [status, betId]
    );

    let newBalance = null;
    let xpGain = 0;

    if (status === "win") {
      xpGain = 25;

      await pool.query(
        "UPDATE users SET balance = balance + $1, xp = COALESCE(xp, 0) + $2 WHERE id = $3",
        [bet.possible_win, xpGain, bet.user_id]
      );

      const userResult = await pool.query(
        "SELECT * FROM users WHERE id = $1",
        [bet.user_id]
      );

      newBalance = Number(userResult.rows[0].balance);

      await pool.query(
        `INSERT INTO balance_history (user_id, amount, type, description, bet_id, balance_after)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          bet.user_id,
          Number(bet.possible_win),
          "bet_win",
          `Win payout for ${bet.match_name} / ${bet.selection}`,
          bet.id,
          newBalance
        ]
      );
    } else {
      xpGain = 5;

      await pool.query(
        "UPDATE users SET xp = COALESCE(xp, 0) + $1 WHERE id = $2",
        [xpGain, bet.user_id]
      );

      const userResult = await pool.query(
        "SELECT * FROM users WHERE id = $1",
        [bet.user_id]
      );

      newBalance = Number(userResult.rows[0].balance);
    }

    const finalUser = await pool.query(
      "SELECT * FROM users WHERE id = $1",
      [bet.user_id]
    );

    const levelInfo = getLevelInfo(finalUser.rows[0].xp);

    res.json({
      ok: true,
      message: "Bet settled",
      newBalance,
      xpGain,
      level: levelInfo.level,
      xp: finalUser.rows[0].xp
    });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
});

app.get("/users", async (req, res) => {
  const user = await getUser(req);
  if (!user) return res.send(layout("Users", user, loginRequiredPage("Users")));
  if (!isAdmin(user)) return res.send(layout("Users", user, deniedPage()));

  try {
    const result = await pool.query(
      "SELECT id, email, balance, xp, active_badge, active_theme, created_at, last_daily_reward_at FROM users ORDER BY id DESC"
    );

    res.send(layout("Users", user, `
      <div class="card">
        <h1>Users</h1>
        <p class="muted">Player list with balance, XP, badge and theme info.</p>
      </div>

      <div class="card">
        ${result.rows.length === 0 ? "<p class='muted'>No users yet.</p>" : result.rows.map(row => {
          const levelInfo = getLevelInfo(row.xp);
          return `
            <div class="user-row">
              <div><strong>ID:</strong> ${row.id}</div>
              <div><strong>Email:</strong> ${row.email}</div>
              <div><strong>Balance:</strong> ${row.balance}</div>
              <div><strong>XP:</strong> ${row.xp || 0}</div>
              <div><strong>Level:</strong> ${levelInfo.level}</div>
              <div><strong>Badge:</strong> ${row.active_badge || "-"}</div>
              <div><strong>Theme:</strong> ${row.active_theme || "default"}</div>
              <div><strong>Last daily reward:</strong> ${row.last_daily_reward_at || "-"}</div>
              <div><strong>Created:</strong> ${row.created_at}</div>
            </div>
          `;
        }).join("")}
      </div>
    `));
  } catch (err) {
    res.send(layout("Users", user, `
      <div class="card">
        <h1>Users</h1>
        <div class="message error" style="display:block;">${err.message}</div>
      </div>
    `));
  }
});

app.get("/bets", async (req, res) => {
  const user = await getUser(req);

  if (req.query.format !== "json") {
    if (!user) return res.send(layout("Bets", user, loginRequiredPage("Bets")));
    if (!isAdmin(user)) return res.send(layout("Bets", user, deniedPage()));
  }

  try {
    const result = await pool.query(`
      SELECT bets.*, users.email
      FROM bets
      LEFT JOIN users ON users.id = bets.user_id
      ORDER BY bets.id DESC
    `);

    if (req.query.format === "json") {
      if (!user || !isAdmin(user)) {
        return res.json({ ok: false, message: "Admin access required" });
      }
      return res.json({ ok: true, bets: result.rows });
    }

    res.send(layout("Bets", user, `
      <div class="card">
        <h1>Bets</h1>
        <p class="muted">All bets in the system.</p>
      </div>

      <div class="card">
        ${result.rows.length === 0 ? "<p class='muted'>No bets yet.</p>" : result.rows.map(bet => {
          const s = normalizeStatus(bet.status);
          return `
            <div class="bet-row">
              <div class="bet-title">${bet.match_name}</div>
              <div class="muted">Selection: ${bet.selection}</div>
              <div><strong>ID:</strong> ${bet.id}</div>
              <div><strong>User:</strong> ${bet.email || bet.user_id}</div>
              <div><strong>Odds:</strong> ${bet.odds}</div>
              <div><strong>Stake:</strong> ${bet.stake}</div>
              <div><strong>Possible win:</strong> ${bet.possible_win}</div>
              <div><span class="status ${s}">${s}</span></div>
            </div>
          `;
        }).join("")}
      </div>
    `));
  } catch (err) {
    if (req.query.format === "json") {
      return res.json({ ok: false, message: err.message });
    }

    res.send(layout("Bets", user, `
      <div class="card">
        <h1>Bets</h1>
        <div class="message error" style="display:block;">${err.message}</div>
      </div>
    `));
  }
});

app.get("/test-register", (req, res) => res.redirect("/register"));
app.get("/test-login", (req, res) => res.redirect("/login"));
app.get("/test-bet", (req, res) => res.redirect("/matches"));
app.get("/test-settle", (req, res) => res.redirect("/admin"));

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log("Running on port", port);
});
