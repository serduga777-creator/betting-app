require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

const DEMO_USER_EMAIL = "demo@test.com";

const bets = [
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
    status: "pending"
  }
];

function normalizeStatus(status) {
  return String(status || "").trim().toLowerCase();
}

async function ensureDemoUser() {
  const existing = await pool.query(
    "SELECT * FROM users WHERE email = $1 LIMIT 1",
    [DEMO_USER_EMAIL]
  );

  if (existing.rows.length) {
    return existing.rows[0];
  }

  const created = await pool.query(
    `INSERT INTO users (email, balance)
     VALUES ($1, $2)
     RETURNING *`,
    [DEMO_USER_EMAIL, 1000]
  );

  return created.rows[0];
}

async function getDemoUser() {
  await ensureDemoUser();

  const result = await pool.query(
    "SELECT * FROM users WHERE email = $1 LIMIT 1",
    [DEMO_USER_EMAIL]
  );

  return result.rows[0];
}

async function getClaimedRewards(userId) {
  const result = await pool.query(
    "SELECT quest_id FROM guest_reward_claims WHERE user_id = $1 ORDER BY id DESC",
    [userId]
  );

  return new Set(result.rows.map((row) => Number(row.quest_id)));
}

async function getBalanceHistory(userId) {
  const result = await pool.query(
    "SELECT * FROM balance_history WHERE user_id = $1 ORDER BY id DESC",
    [userId]
  );

  return result.rows;
}

function getQuestDefinitions() {
  const totalBets = bets.length;
  const totalWins = bets.filter((bet) => normalizeStatus(bet.status) === "win").length;
  const totalStake = bets.reduce((sum, bet) => sum + Number(bet.stake || 0), 0);

  return {
    stats: {
      totalBets,
      totalWins,
      totalStake
    },
    quests: [
      {
        id: 1,
        title: "Place 1 bet",
        description: "Make your first bet today.",
        reward: 5,
        done: totalBets >= 1,
        progress: `${Math.min(totalBets, 1)}/1`
      },
      {
        id: 2,
        title: "Win 1 bet",
        description: "Get one winning bet.",
        reward: 10,
        done: totalWins >= 1,
        progress: `${Math.min(totalWins, 1)}/1`
      },
      {
        id: 3,
        title: "Stake 20 total",
        description: "Reach total stake of 20.",
        reward: 15,
        done: totalStake >= 20,
        progress: `${Math.min(totalStake, 20)}/20`
      }
    ]
  };
}

async function getDailyGuestData() {
  const user = await getDemoUser();
  const claimedRewards = await getClaimedRewards(user.id);
  const data = getQuestDefinitions();

  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      balance: Number(user.balance)
    },
    stats: data.stats,
    quests: data.quests.map((quest) => ({
      ...quest,
      claimed: claimedRewards.has(Number(quest.id)),
      canClaim: quest.done && !claimedRewards.has(Number(quest.id))
    }))
  };
}

function navHtml(active, balance) {
  const item = (href, label, key) => {
    const activeClass = active === key ? "nav-link active" : "nav-link";
    return `<a class="${activeClass}" href="${href}">${label}</a>`;
  };

  return `
    <div class="nav-wrap">
      <div class="nav-left">
        <div class="nav-brand">🌙 Night Arena</div>
      </div>

      <div class="nav-links">
        ${item("/", "Home", "home")}
        ${item("/daily-guests", "Daily Guests", "daily-guests")}
        ${item("/history", "History", "history")}
        ${item("/profile", "Me", "me")}
      </div>

      <div class="nav-right">
        <div class="balance-chip">
          💰 Balance: <span id="navBalance">${balance}</span>
        </div>
      </div>
    </div>
  `;
}

function baseStyles() {
  return `
    * { box-sizing: border-box; }

    body {
      margin: 0;
      font-family: Arial, sans-serif;
      background: linear-gradient(135deg, #0b1020, #111827);
      color: white;
      padding: 20px;
    }

    .wrap {
      max-width: 980px;
      margin: 0 auto;
    }

    .nav-wrap {
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      gap: 14px;
      background: #18233f;
      border: 1px solid #26324d;
      border-radius: 20px;
      padding: 18px 20px;
      margin-bottom: 16px;
    }

    .nav-left, .nav-right {
      display: flex;
      align-items: center;
    }

    .nav-brand {
      font-size: 24px;
      font-weight: 800;
      white-space: nowrap;
    }

    .nav-links {
      display: flex;
      justify-content: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .nav-link {
      display: inline-block;
      text-decoration: none;
      padding: 11px 15px;
      border-radius: 12px;
      font-weight: bold;
      color: #dbeafe;
      background: rgba(59, 130, 246, 0.12);
      border: 1px solid rgba(59, 130, 246, 0.22);
    }

    .nav-link.active {
      background: linear-gradient(180deg, #3b82f6, #2563eb);
      border-color: transparent;
      color: white;
    }

    .balance-chip {
      display: inline-block;
      padding: 10px 14px;
      border-radius: 999px;
      font-weight: bold;
      font-size: 14px;
      background: rgba(34, 197, 94, 0.16);
      border: 1px solid rgba(34, 197, 94, 0.35);
      color: #86efac;
      white-space: nowrap;
    }

    .card {
      background: #18233f;
      border: 1px solid #26324d;
      border-radius: 20px;
      padding: 20px;
      margin-bottom: 16px;
    }

    .title {
      font-size: 40px;
      font-weight: 800;
      margin-bottom: 10px;
    }

    .subtitle {
      color: #94a3b8;
      line-height: 1.6;
      margin-bottom: 16px;
    }

    .button {
      display: inline-block;
      padding: 12px 16px;
      border-radius: 12px;
      font-weight: bold;
      color: white;
      background: linear-gradient(180deg, #3b82f6, #2563eb);
      border: none;
      cursor: pointer;
      text-decoration: none;
      transition: transform 0.15s ease, filter 0.15s ease;
    }

    .button:hover {
      filter: brightness(1.05);
      transform: translateY(-1px);
    }

    .button.claim {
      background: linear-gradient(180deg, #22c55e, #16a34a);
    }

    .button.gray {
      background: linear-gradient(180deg, #475569, #334155);
    }

    .button.disabled {
      background: linear-gradient(180deg, #475569, #334155);
      cursor: default;
      transform: none;
    }

    .hero {
      background: linear-gradient(135deg, #1d4ed8, #8b5cf6);
      border-radius: 22px;
      padding: 24px;
      margin-bottom: 16px;
    }

    .hero h1 {
      margin: 0 0 10px;
      font-size: 40px;
    }

    .hero p {
      margin: 0;
      color: rgba(255,255,255,0.92);
      line-height: 1.6;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin-top: 10px;
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

    .quests {
      display: grid;
      gap: 14px;
    }

    .quest {
      position: relative;
      overflow: hidden;
      background: rgba(15, 23, 42, 0.72);
      border: 1px solid #273449;
      border-radius: 18px;
      padding: 18px;
      transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .quest.done-card {
      border-color: rgba(34, 197, 94, 0.45);
    }

    .quest.claimed-card {
      border-color: rgba(139, 92, 246, 0.45);
    }

    .quest-top {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 10px;
    }

    .quest-icon {
      font-size: 34px;
    }

    .quest-title {
      font-size: 22px;
      font-weight: 800;
    }

    .quest-desc {
      color: #cbd5e1;
      margin-bottom: 12px;
      line-height: 1.5;
    }

    .quest-row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
    }

    .pill {
      display: inline-block;
      padding: 9px 14px;
      border-radius: 999px;
      font-weight: bold;
      font-size: 14px;
    }

    .reward {
      background: rgba(34, 197, 94, 0.16);
      border: 1px solid rgba(34, 197, 94, 0.35);
      color: #86efac;
    }

    .progress {
      background: rgba(59, 130, 246, 0.16);
      border: 1px solid rgba(59, 130, 246, 0.35);
      color: #93c5fd;
    }

    .done {
      background: rgba(34, 197, 94, 0.16);
      border: 1px solid rgba(34, 197, 94, 0.35);
      color: #86efac;
    }

    .todo {
      background: rgba(245, 158, 11, 0.16);
      border: 1px solid rgba(245, 158, 11, 0.35);
      color: #fbbf24;
    }

    .claimed {
      background: rgba(139, 92, 246, 0.16);
      border: 1px solid rgba(139, 92, 246, 0.35);
      color: #c4b5fd;
    }

    .muted, .loading {
      color: #94a3b8;
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
      background: rgba(34, 197, 94, 0.16);
      color: #86efac;
      border: 1px solid rgba(34, 197, 94, 0.35);
    }

    .message.error {
      display: block;
      background: rgba(239, 68, 68, 0.16);
      color: #fca5a5;
      border: 1px solid rgba(239, 68, 68, 0.35);
    }

    .link-grid, .history-list {
      display: grid;
      gap: 14px;
    }

    .link-grid {
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    }

    .feature, .history-item {
      background: rgba(15, 23, 42, 0.72);
      border: 1px solid #273449;
      border-radius: 18px;
      padding: 18px;
    }

    .feature h3, .history-type {
      margin-top: 0;
      font-size: 24px;
      font-weight: 800;
    }

    .feature p {
      color: #cbd5e1;
      line-height: 1.5;
    }

    .toast {
      position: fixed;
      right: 20px;
      bottom: 20px;
      min-width: 220px;
      max-width: 360px;
      padding: 14px 16px;
      border-radius: 14px;
      font-weight: bold;
      box-shadow: 0 10px 30px rgba(0,0,0,0.35);
      transform: translateY(20px);
      opacity: 0;
      pointer-events: none;
      transition: all 0.25s ease;
      z-index: 9999;
    }

    .toast.show {
      transform: translateY(0);
      opacity: 1;
    }

    .toast.success {
      background: rgba(34, 197, 94, 0.95);
      color: white;
    }

    .toast.error {
      background: rgba(239, 68, 68, 0.95);
      color: white;
    }

    @media (max-width: 900px) {
      .nav-wrap {
        grid-template-columns: 1fr;
      }

      .nav-links {
        justify-content: flex-start;
      }

      .nav-right {
        justify-content: flex-start;
      }
    }
  `;
}

function toastScript() {
  return `
    <div id="toast" class="toast"></div>
    <script>
      function updateAllBalanceTexts(value) {
        document.querySelectorAll("#navBalance").forEach(function(el) {
          el.textContent = value;
        });
      }

      function showToast(text, type) {
        var toast = document.getElementById("toast");
        if (!toast) return;

        toast.className = "toast " + type;
        toast.textContent = text;

        requestAnimationFrame(function() {
          toast.classList.add("show");
        });

        clearTimeout(window.__toastTimer);
        window.__toastTimer = setTimeout(function() {
          toast.classList.remove("show");
        }, 2200);
      }
    </script>
  `;
}

app.get("/init-db", async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        balance NUMERIC NOT NULL DEFAULT 1000,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS guest_reward_claims (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        quest_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, quest_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS balance_history (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        type TEXT NOT NULL,
        description TEXT,
        amount NUMERIC NOT NULL,
        balance_after NUMERIC NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const demoUser = await ensureDemoUser();

    const historyCheck = await pool.query(
      "SELECT id FROM balance_history WHERE user_id = $1 LIMIT 1",
      [demoUser.id]
    );

    if (!historyCheck.rows.length) {
      await pool.query(
        `INSERT INTO balance_history (user_id, type, description, amount, balance_after)
         VALUES ($1, $2, $3, $4, $5)`,
        [demoUser.id, "seed", "Initial demo balance", 1000, 1000]
      );
    }

    res.json({ ok: true, message: "Database initialized" });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

app.get("/", async (req, res) => {
  const currentUser = await getDemoUser();

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Night Arena</title>
      <style>${baseStyles()}</style>
    </head>
    <body>
      <div class="wrap">
        ${navHtml("home", Number(currentUser.balance))}

        <div class="hero">
          <h1>Night Arena</h1>
          <p>Demo betting app with DB persistence for balance, reward claims and history.</p>
        </div>

        <div class="card">
          <div class="title" style="font-size:28px;">Welcome</div>
          <div class="subtitle">
            Теперь баланс и claimed rewards сохраняются в базе.
          </div>

          <div class="stats">
            <div class="stat">
              <div class="stat-label">Demo user</div>
              <div class="stat-value" style="font-size:20px;">${currentUser.email}</div>
            </div>
            <div class="stat">
              <div class="stat-label">Balance</div>
              <div class="stat-value">${Number(currentUser.balance)}</div>
            </div>
            <div class="stat">
              <div class="stat-label">Bets</div>
              <div class="stat-value">${bets.length}</div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="title" style="font-size:28px;">Navigation</div>
          <div class="link-grid">
            <div class="feature">
              <h3>🎯 Daily Guests</h3>
              <p>Открыть квесты и забрать награды.</p>
              <a class="button" href="/daily-guests">Open Daily Guests</a>
            </div>

            <div class="feature">
              <h3>📜 History</h3>
              <p>Посмотреть историю баланса из базы.</p>
              <a class="button gray" href="/history">Open History</a>
            </div>

            <div class="feature">
              <h3>👤 Me</h3>
              <p>Открыть профиль demo-пользователя.</p>
              <a class="button gray" href="/profile">Open Me</a>
            </div>

            <div class="feature">
              <h3>🛠 Init DB</h3>
              <p>Инициализировать таблицы один раз.</p>
              <a class="button gray" href="/init-db">Run Init DB</a>
            </div>
          </div>
        </div>
      </div>
      ${toastScript()}
    </body>
    </html>
  `);
});

app.get("/profile", async (req, res) => {
  const currentUser = await getDemoUser();

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Me</title>
      <style>${baseStyles()}</style>
    </head>
    <body>
      <div class="wrap">
        ${navHtml("me", Number(currentUser.balance))}

        <div class="card">
          <div class="title">Me</div>
          <div class="subtitle">Current demo user profile from database.</div>

          <div class="stats">
            <div class="stat">
              <div class="stat-label">User ID</div>
              <div class="stat-value">${currentUser.id}</div>
            </div>
            <div class="stat">
              <div class="stat-label">Email</div>
              <div class="stat-value" style="font-size:20px;">${currentUser.email}</div>
            </div>
            <div class="stat">
              <div class="stat-label">Balance</div>
              <div class="stat-value">${Number(currentUser.balance)}</div>
            </div>
            <div class="stat">
              <div class="stat-label">Total bets</div>
              <div class="stat-value">${bets.length}</div>
            </div>
          </div>
        </div>
      </div>
      ${toastScript()}
    </body>
    </html>
  `);
});

app.get("/history", async (req, res) => {
  const currentUser = await getDemoUser();
  const history = await getBalanceHistory(currentUser.id);

  const historyHtml = history
    .map((item) => {
      return `
        <div class="history-item">
          <div class="history-type">${item.type}</div>
          <div><strong>Description:</strong> ${item.description || "-"}</div>
          <div><strong>Amount:</strong> ${Number(item.amount)}</div>
          <div><strong>Balance after:</strong> ${Number(item.balance_after)}</div>
          <div><strong>Created:</strong> ${item.created_at}</div>
        </div>
      `;
    })
    .join("");

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>History</title>
      <style>${baseStyles()}</style>
    </head>
    <body>
      <div class="wrap">
        ${navHtml("history", Number(currentUser.balance))}

        <div class="card">
          <div class="title">History</div>
          <div class="subtitle">Balance history from database.</div>
        </div>

        <div class="card">
          <div class="title" style="font-size:28px;">Balance history</div>
          <div class="history-list">
            ${historyHtml || '<div class="muted">No history yet.</div>'}
          </div>
        </div>
      </div>
      ${toastScript()}
    </body>
    </html>
  `);
});

app.get("/health", (req, res) => {
  res.send("ok");
});

app.get("/me", async (req, res) => {
  const currentUser = await getDemoUser();

  res.json({
    ok: true,
    user: {
      id: currentUser.id,
      email: currentUser.email,
      balance: Number(currentUser.balance)
    }
  });
});

app.get("/my-bets", (req, res) => {
  res.json({
    ok: true,
    bets
  });
});

app.get("/balance-history", async (req, res) => {
  const currentUser = await getDemoUser();
  const history = await getBalanceHistory(currentUser.id);

  res.json({
    ok: true,
    history
  });
});

app.get("/api/daily-guests", async (req, res) => {
  const data = await getDailyGuestData();
  res.json(data);
});

app.post("/api/daily-guests/claim", async (req, res) => {
  try {
    const questId = Number(req.body.questId || 0);
    const currentUser = await getDemoUser();
    const data = getQuestDefinitions();
    const quest = data.quests.find((item) => item.id === questId);

    if (!quest) {
      return res.status(404).json({
        ok: false,
        message: "Quest not found"
      });
    }

    if (!quest.done) {
      return res.status(400).json({
        ok: false,
        message: "Quest is not completed yet"
      });
    }

    const existing = await pool.query(
      "SELECT id FROM guest_reward_claims WHERE user_id = $1 AND quest_id = $2 LIMIT 1",
      [currentUser.id, questId]
    );

    if (existing.rows.length) {
      return res.status(400).json({
        ok: false,
        message: "Reward already claimed"
      });
    }

    const newBalance = Number(currentUser.balance) + Number(quest.reward);

    await pool.query(
      "UPDATE users SET balance = $1 WHERE id = $2",
      [newBalance, currentUser.id]
    );

    await pool.query(
      `INSERT INTO guest_reward_claims (user_id, quest_id)
       VALUES ($1, $2)`,
      [currentUser.id, questId]
    );

    await pool.query(
      `INSERT INTO balance_history (user_id, type, description, amount, balance_after)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        currentUser.id,
        "daily_guest_reward",
        `Claim reward for: ${quest.title}`,
        Number(quest.reward),
        newBalance
      ]
    );

    return res.json({
      ok: true,
      message: "Reward claimed",
      reward: quest.reward,
      balance: newBalance,
      questId
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: err.message
    });
  }
});

app.get("/daily-guests", async (req, res) => {
  const currentUser = await getDemoUser();

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Daily Guests</title>
      <style>${baseStyles()}</style>
    </head>
    <body>
      <div class="wrap">
        ${navHtml("daily-guests", Number(currentUser.balance))}

        <div class="card">
          <div class="title">Daily Guests</div>
          <div class="subtitle">Live guest quests with DB persistence.</div>
          <button class="button" onclick="loadDailyGuests()">Refresh quests</button>
          <div id="messageBox" class="message"></div>
        </div>

        <div id="statsBox" class="card">
          <div class="loading">Loading stats...</div>
        </div>

        <div id="questsBox" class="card">
          <div class="loading">Loading quests...</div>
        </div>
      </div>

      ${toastScript()}

      <script>
        async function claimReward(questId) {
          try {
            const res = await fetch("/api/daily-guests/claim", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({ questId })
            });

            const data = await res.json();

            if (!data.ok) {
              showToast(data.message || "Could not claim reward", "error");
              return;
            }

            updateAllBalanceTexts(data.balance);
            showToast("+" + data.reward + " claimed", "success");
            loadDailyGuests();
          } catch (error) {
            showToast("Server error", "error");
          }
        }

        function iconForQuest(title) {
          const t = String(title || "").toLowerCase();
          if (t.includes("place")) return "🎯";
          if (t.includes("win")) return "🏆";
          if (t.includes("stake")) return "💰";
          return "⭐";
        }

        async function loadDailyGuests() {
          try {
            const res = await fetch("/api/daily-guests", { cache: "no-store" });
            const data = await res.json();

            if (!data.ok) {
              document.getElementById("statsBox").innerHTML = "<div class='muted'>Could not load stats.</div>";
              document.getElementById("questsBox").innerHTML = "<div class='muted'>Could not load quests.</div>";
              return;
            }

            updateAllBalanceTexts(data.user.balance);

            document.getElementById("statsBox").innerHTML = \`
              <div class="title" style="font-size:26px;">Today stats</div>
              <div class="stats">
                <div class="stat">
                  <div class="stat-label">Balance</div>
                  <div class="stat-value">\${data.user.balance}</div>
                </div>
                <div class="stat">
                  <div class="stat-label">Total bets</div>
                  <div class="stat-value">\${data.stats.totalBets}</div>
                </div>
                <div class="stat">
                  <div class="stat-label">Wins</div>
                  <div class="stat-value">\${data.stats.totalWins}</div>
                </div>
                <div class="stat">
                  <div class="stat-label">Stake total</div>
                  <div class="stat-value">\${data.stats.totalStake}</div>
                </div>
              </div>
            \`;

            document.getElementById("questsBox").innerHTML = \`
              <div class="title" style="font-size:26px;">Today quests</div>
              <div class="quests">
                \${data.quests.map((q) => \`
                  <div class="quest \${q.claimed ? "claimed-card" : q.done ? "done-card" : ""}">
                    <div class="quest-top">
                      <div class="quest-icon">\${iconForQuest(q.title)}</div>
                      <div class="quest-title">\${q.title}</div>
                    </div>

                    <div class="quest-desc">\${q.description}</div>

                    <div class="quest-row">
                      <span class="pill reward">Reward: +\${q.reward}</span>
                      <span class="pill progress">Progress: \${q.progress}</span>
                      \${q.claimed
                        ? '<span class="pill claimed">CLAIMED</span>'
                        : q.done
                          ? '<span class="pill done">DONE</span>'
                          : '<span class="pill todo">IN PROGRESS</span>'}
                    </div>

                    <div style="margin-top:14px;">
                      \${q.canClaim
                        ? '<button class="button claim" onclick="claimReward(' + q.id + ')">Claim reward</button>'
                        : q.claimed
                          ? '<button class="button disabled" disabled>Reward claimed</button>'
                          : '<button class="button disabled" disabled>Complete quest first</button>'}
                    </div>
                  </div>
                \`).join("")}
              </div>
            \`;
          } catch (error) {
            document.getElementById("statsBox").innerHTML = "<div class='muted'>Server error.</div>";
            document.getElementById("questsBox").innerHTML = "<div class='muted'>Server error.</div>";
          }
        }

        loadDailyGuests();
      </script>
    </body>
    </html>
  `);
});

const port = process.env.PORT || 3000;

app.listen(port, "0.0.0.0", () => {
  console.log("Server running on port", port);
});
