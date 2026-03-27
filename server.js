const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const user = {
  id: 1,
  email: "demo@test.com",
  balance: 1000
};

let nextBetId = 3;
let nextHistoryId = 3;

const availableMatches = [
  {
    id: 1,
    league: "La Liga",
    match_name: "Real Madrid vs Barcelona",
    outcomes: [
      { selection: "Real Madrid win", odds: 2.1 },
      { selection: "Draw", odds: 3.4 },
      { selection: "Barcelona win", odds: 2.9 }
    ]
  },
  {
    id: 2,
    league: "Premier League",
    match_name: "Man City vs Liverpool",
    outcomes: [
      { selection: "Man City win", odds: 1.9 },
      { selection: "Draw", odds: 3.6 },
      { selection: "Liverpool win", odds: 3.1 }
    ]
  },
  {
    id: 3,
    league: "Bundesliga",
    match_name: "Bayern vs Dortmund",
    outcomes: [
      { selection: "Bayern win", odds: 1.8 },
      { selection: "Draw", odds: 3.8 },
      { selection: "Dortmund win", odds: 4.0 }
    ]
  }
];

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

const balanceHistory = [
  {
    id: 1,
    type: "bet_win",
    description: "Win payout for Real Madrid vs Barcelona",
    amount: 21,
    balance_after: 1021,
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    type: "bet_stake",
    description: "Stake for Man City vs Liverpool",
    amount: -10,
    balance_after: 1011,
    created_at: new Date().toISOString()
  }
];

const claimedGuestRewards = new Set();

function normalizeStatus(status) {
  return String(status || "").trim().toLowerCase();
}

function questRewardKey(questId) {
  return `user:${user.id}:quest:${questId}`;
}

function isQuestClaimed(questId) {
  return claimedGuestRewards.has(questRewardKey(questId));
}

function claimQuest(questId) {
  claimedGuestRewards.add(questRewardKey(questId));
}

function pushHistory(type, description, amount, balanceAfter) {
  balanceHistory.unshift({
    id: nextHistoryId++,
    type,
    description,
    amount,
    balance_after: balanceAfter,
    created_at: new Date().toISOString()
  });
}

function getStats() {
  const totalBets = bets.length;
  const totalWins = bets.filter((bet) => normalizeStatus(bet.status) === "win").length;
  const totalLoses = bets.filter((bet) => normalizeStatus(bet.status) === "lose").length;
  const totalPending = bets.filter((bet) => normalizeStatus(bet.status) === "pending").length;
  const totalStake = bets.reduce((sum, bet) => sum + Number(bet.stake || 0), 0);

  return {
    totalBets,
    totalWins,
    totalLoses,
    totalPending,
    totalStake
  };
}

function getQuestDefinitions() {
  const stats = getStats();

  return {
    stats: {
      totalBets: stats.totalBets,
      totalWins: stats.totalWins,
      totalStake: stats.totalStake
    },
    quests: [
      {
        id: 1,
        title: "Place 1 bet",
        description: "Make your first bet today.",
        reward: 5,
        done: stats.totalBets >= 1,
        progress: `${Math.min(stats.totalBets, 1)}/1`
      },
      {
        id: 2,
        title: "Win 1 bet",
        description: "Get one winning bet.",
        reward: 10,
        done: stats.totalWins >= 1,
        progress: `${Math.min(stats.totalWins, 1)}/1`
      },
      {
        id: 3,
        title: "Stake 20 total",
        description: "Reach total stake of 20.",
        reward: 15,
        done: stats.totalStake >= 20,
        progress: `${Math.min(stats.totalStake, 20)}/20`
      }
    ]
  };
}

function getDailyGuestData() {
  const data = getQuestDefinitions();

  return {
    ok: true,
    user,
    stats: data.stats,
    quests: data.quests.map((quest) => ({
      ...quest,
      claimed: isQuestClaimed(quest.id),
      canClaim: quest.done && !isQuestClaimed(quest.id)
    }))
  };
}

function navHtml(active) {
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
        ${item("/dashboard", "Dashboard", "dashboard")}
        ${item("/matches", "Matches", "matches")}
        ${item("/daily-guests", "Daily Guests", "daily-guests")}
        ${item("/history", "History", "history")}
        ${item("/profile", "Me", "me")}
      </div>

      <div class="nav-right">
        <div class="balance-chip">
          💰 Balance: <span id="navBalance">${user.balance}</span>
        </div>
      </div>
    </div>
  `;
}

function baseStyles() {
  return `
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      font-family: Arial, sans-serif;
      background: linear-gradient(135deg, #0b1020, #111827);
      color: white;
      padding: 20px;
    }

    .wrap {
      max-width: 1120px;
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

    .button.red {
      background: linear-gradient(180deg, #ef4444, #dc2626);
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

    .muted {
      color: #94a3b8;
    }

    .loading {
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

    .link-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 14px;
    }

    .feature {
      background: rgba(15, 23, 42, 0.72);
      border: 1px solid #273449;
      border-radius: 18px;
      padding: 18px;
    }

    .feature h3 {
      margin-top: 0;
      font-size: 24px;
    }

    .feature p {
      color: #cbd5e1;
      line-height: 1.5;
    }

    .history-list {
      display: grid;
      gap: 12px;
    }

    .history-item {
      background: rgba(15, 23, 42, 0.72);
      border: 1px solid #273449;
      border-radius: 16px;
      padding: 16px;
    }

    .history-type {
      font-size: 18px;
      font-weight: 800;
      margin-bottom: 8px;
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

    .quest:hover {
      transform: translateY(-2px);
      border-color: #385075;
    }

    .quest.done-card {
      border-color: rgba(34, 197, 94, 0.45);
      box-shadow: 0 0 0 1px rgba(34, 197, 94, 0.08), 0 8px 30px rgba(34, 197, 94, 0.08);
    }

    .quest.claimed-card {
      border-color: rgba(139, 92, 246, 0.45);
      box-shadow: 0 0 0 1px rgba(139, 92, 246, 0.08), 0 8px 30px rgba(139, 92, 246, 0.08);
    }

    .quest.animate-complete {
      animation: questCompletePop 0.6s ease;
    }

    .quest.animate-claim {
      animation: questClaimFlash 0.9s ease;
    }

    .quest::after {
      content: "";
      position: absolute;
      top: -20%;
      left: -120%;
      width: 80px;
      height: 140%;
      transform: rotate(18deg);
      background: linear-gradient(
        90deg,
        rgba(255,255,255,0) 0%,
        rgba(255,255,255,0.10) 50%,
        rgba(255,255,255,0) 100%
      );
      pointer-events: none;
    }

    .quest.animate-claim::after {
      animation: shineSweep 0.9s ease;
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

    .matches-grid {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 16px;
    }

    .match-card {
      background: rgba(15, 23, 42, 0.72);
      border: 1px solid #273449;
      border-radius: 18px;
      padding: 18px;
      margin-bottom: 14px;
    }

    .league-pill {
      display: inline-block;
      margin-bottom: 10px;
      padding: 7px 11px;
      border-radius: 999px;
      background: rgba(139, 92, 246, 0.16);
      border: 1px solid rgba(139, 92, 246, 0.35);
      color: #c4b5fd;
      font-weight: bold;
      font-size: 13px;
    }

    .match-title {
      font-size: 28px;
      font-weight: 800;
      margin-bottom: 14px;
    }

    .odds-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }

    .odds-btn {
      width: 100%;
      border: none;
      border-radius: 14px;
      padding: 14px 10px;
      font-weight: bold;
      color: white;
      cursor: pointer;
      background: linear-gradient(180deg, #2563eb, #1d4ed8);
    }

    .odds-btn:hover {
      filter: brightness(1.05);
    }

    .bet-slip {
      background: rgba(15, 23, 42, 0.72);
      border: 1px solid #273449;
      border-radius: 18px;
      padding: 18px;
      position: sticky;
      top: 20px;
    }

    .slip-box {
      background: #0f172a;
      border: 1px solid #273449;
      border-radius: 16px;
      padding: 14px;
      margin-bottom: 12px;
    }

    .slip-big {
      font-size: 24px;
      font-weight: 800;
      margin-bottom: 6px;
    }

    .input {
      width: 100%;
      border: 1px solid #334155;
      background: #0f172a;
      color: white;
      border-radius: 12px;
      padding: 12px 14px;
      font-size: 16px;
      margin: 10px 0 12px;
    }

    .bets-list {
      display: grid;
      gap: 12px;
    }

    .bet-item {
      background: rgba(15, 23, 42, 0.72);
      border: 1px solid #273449;
      border-radius: 16px;
      padding: 16px;
    }

    .status-pill {
      display: inline-block;
      margin-top: 10px;
      padding: 7px 11px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
    }

    .status-pill.win {
      background: rgba(34, 197, 94, 0.16);
      border: 1px solid rgba(34, 197, 94, 0.35);
      color: #86efac;
    }

    .status-pill.pending {
      background: rgba(245, 158, 11, 0.16);
      border: 1px solid rgba(245, 158, 11, 0.35);
      color: #fbbf24;
    }

    .status-pill.lose {
      background: rgba(239, 68, 68, 0.16);
      border: 1px solid rgba(239, 68, 68, 0.35);
      color: #fca5a5;
    }

    .settle-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 12px;
    }

    .dashboard-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .dashboard-full {
      grid-column: 1 / -1;
    }

    @keyframes questCompletePop {
      0% { transform: scale(1); box-shadow: 0 0 0 rgba(34, 197, 94, 0); }
      35% { transform: scale(1.02); box-shadow: 0 0 0 6px rgba(34, 197, 94, 0.10); }
      100% { transform: scale(1); box-shadow: 0 0 0 rgba(34, 197, 94, 0); }
    }

    @keyframes questClaimFlash {
      0% { transform: scale(1); box-shadow: 0 0 0 rgba(139, 92, 246, 0); }
      30% { transform: scale(1.02); box-shadow: 0 0 0 8px rgba(139, 92, 246, 0.14); }
      100% { transform: scale(1); box-shadow: 0 0 0 rgba(139, 92, 246, 0); }
    }

    @keyframes shineSweep {
      0% { left: -120%; }
      100% { left: 135%; }
    }

    @media (max-width: 980px) {
      .nav-wrap {
        grid-template-columns: 1fr;
      }

      .nav-links {
        justify-content: flex-start;
      }

      .nav-right {
        justify-content: flex-start;
      }

      .matches-grid,
      .dashboard-grid {
        grid-template-columns: 1fr;
      }

      .bet-slip {
        position: static;
      }
    }

    @media (max-width: 700px) {
      .title {
        font-size: 32px;
      }

      .hero h1 {
        font-size: 32px;
      }

      .nav-brand {
        font-size: 20px;
      }

      .odds-grid {
        grid-template-columns: 1fr;
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

app.get("/", (req, res) => {
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
        ${navHtml("home")}

        <div class="hero">
          <h1>Night Arena</h1>
          <p>Demo betting app with dashboard, live matches, manual settlement, quests and reward claim.</p>
        </div>

        <div class="card">
          <div class="title" style="font-size:28px;">Welcome</div>
          <div class="subtitle">
            Теперь у тебя есть отдельный Dashboard со сводкой по всему сайту.
          </div>

          <div class="stats">
            <div class="stat">
              <div class="stat-label">Demo user</div>
              <div class="stat-value" style="font-size:20px;">${user.email}</div>
            </div>
            <div class="stat">
              <div class="stat-label">Balance</div>
              <div class="stat-value">${user.balance}</div>
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
              <h3>📊 Dashboard</h3>
              <p>Open the full project overview page.</p>
              <a class="button" href="/dashboard">Open Dashboard</a>
            </div>

            <div class="feature">
              <h3>⚽ Matches</h3>
              <p>Place new bets and settle pending bets.</p>
              <a class="button gray" href="/matches">Open Matches</a>
            </div>

            <div class="feature">
              <h3>🎯 Daily Guests</h3>
              <p>Track quest progress and claim rewards.</p>
              <a class="button gray" href="/daily-guests">Open Daily Guests</a>
            </div>

            <div class="feature">
              <h3>📜 History</h3>
              <p>See all balance changes and payouts.</p>
              <a class="button gray" href="/history">Open History</a>
            </div>
          </div>
        </div>
      </div>
      ${toastScript()}
    </body>
    </html>
  `);
});

app.get("/dashboard", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Dashboard</title>
      <style>${baseStyles()}</style>
    </head>
    <body>
      <div class="wrap">
        ${navHtml("dashboard")}

        <div class="card">
          <div class="title">Dashboard</div>
          <div class="subtitle">Balance, quest progress, recent bets and quick actions in one place.</div>
        </div>

        <div id="dashboardRoot" class="dashboard-grid">
          <div class="card dashboard-full">
            <div class="loading">Loading dashboard...</div>
          </div>
        </div>
      </div>

      ${toastScript()}

      <script>
        function questIcon(title) {
          const t = String(title || "").toLowerCase();
          if (t.includes("place")) return "🎯";
          if (t.includes("win")) return "🏆";
          if (t.includes("stake")) return "💰";
          return "⭐";
        }

        async function loadDashboard() {
          try {
            const [meRes, betsRes, guestsRes] = await Promise.all([
              fetch("/me", { cache: "no-store" }),
              fetch("/my-bets", { cache: "no-store" }),
              fetch("/api/daily-guests", { cache: "no-store" })
            ]);

            const meData = await meRes.json();
            const betsData = await betsRes.json();
            const guestsData = await guestsRes.json();

            if (!meData.ok || !betsData.ok || !guestsData.ok) {
              document.getElementById("dashboardRoot").innerHTML = '<div class="card dashboard-full"><div class="muted">Could not load dashboard.</div></div>';
              return;
            }

            updateAllBalanceTexts(meData.user.balance);

            const recentBets = (betsData.bets || []).slice(0, 5);
            const quests = guestsData.quests || [];
            const completedQuests = quests.filter(q => q.done).length;
            const claimedQuests = quests.filter(q => q.claimed).length;

            const wins = (betsData.bets || []).filter(b => String(b.status).toLowerCase() === "win").length;
            const loses = (betsData.bets || []).filter(b => String(b.status).toLowerCase() === "lose").length;
            const pending = (betsData.bets || []).filter(b => String(b.status).toLowerCase() === "pending").length;
            const totalStake = (betsData.bets || []).reduce((sum, b) => sum + Number(b.stake || 0), 0);

            document.getElementById("dashboardRoot").innerHTML = \`
              <div class="card dashboard-full">
                <div class="hero" style="margin-bottom:0;">
                  <h1 style="font-size:32px;">Welcome back, \${meData.user.email}</h1>
                  <p>Your current balance, quests and recent actions are all here.</p>
                </div>
              </div>

              <div class="card">
                <div class="title" style="font-size:26px;">Balance & Stats</div>
                <div class="stats">
                  <div class="stat">
                    <div class="stat-label">Balance</div>
                    <div class="stat-value">\${meData.user.balance}</div>
                  </div>
                  <div class="stat">
                    <div class="stat-label">Total bets</div>
                    <div class="stat-value">\${betsData.bets.length}</div>
                  </div>
                  <div class="stat">
                    <div class="stat-label">Wins</div>
                    <div class="stat-value">\${wins}</div>
                  </div>
                  <div class="stat">
                    <div class="stat-label">Pending</div>
                    <div class="stat-value">\${pending}</div>
                  </div>
                  <div class="stat">
                    <div class="stat-label">Loses</div>
                    <div class="stat-value">\${loses}</div>
                  </div>
                  <div class="stat">
                    <div class="stat-label">Stake total</div>
                    <div class="stat-value">\${totalStake}</div>
                  </div>
                </div>
              </div>

              <div class="card">
                <div class="title" style="font-size:26px;">Quest Progress</div>
                <div class="stats">
                  <div class="stat">
                    <div class="stat-label">Completed</div>
                    <div class="stat-value">\${completedQuests}</div>
                  </div>
                  <div class="stat">
                    <div class="stat-label">Claimed</div>
                    <div class="stat-value">\${claimedQuests}</div>
                  </div>
                </div>

                <div class="quests" style="margin-top:16px;">
                  \${quests.map(q => \`
                    <div class="quest \${q.claimed ? "claimed-card" : q.done ? "done-card" : ""}">
                      <div class="quest-top">
                        <div class="quest-icon">\${questIcon(q.title)}</div>
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
                    </div>
                  \`).join("")}
                </div>
              </div>

              <div class="card dashboard-full">
                <div class="title" style="font-size:26px;">Recent Bets</div>
                \${recentBets.length ? '<div class="bets-list">' + recentBets.map(bet => \`
                  <div class="bet-item">
                    <div style="font-size:22px; font-weight:800; margin-bottom:6px;">\${bet.match_name}</div>
                    <div class="muted" style="margin-bottom:8px;">Selection: \${bet.selection}</div>
                    <div><strong>Stake:</strong> \${bet.stake}</div>
                    <div><strong>Odds:</strong> \${bet.odds}</div>
                    <div><strong>Possible win:</strong> \${bet.possible_win}</div>
                    <div class="status-pill \${String(bet.status).toLowerCase()}">\${bet.status}</div>
                  </div>
                \`).join("") + '</div>' : '<div class="muted">No bets yet.</div>'}
              </div>

              <div class="card dashboard-full">
                <div class="title" style="font-size:26px;">Quick Actions</div>
                <div class="link-grid">
                  <div class="feature">
                    <h3>⚽ Matches</h3>
                    <p>Place a new bet or settle existing bets.</p>
                    <a class="button" href="/matches">Go to Matches</a>
                  </div>
                  <div class="feature">
                    <h3>🎯 Daily Guests</h3>
                    <p>Claim rewards for completed quests.</p>
                    <a class="button gray" href="/daily-guests">Go to Daily Guests</a>
                  </div>
                  <div class="feature">
                    <h3>📜 History</h3>
                    <p>See payouts, stakes and reward claims.</p>
                    <a class="button gray" href="/history">Go to History</a>
                  </div>
                  <div class="feature">
                    <h3>👤 Me</h3>
                    <p>Open your profile view.</p>
                    <a class="button gray" href="/profile">Go to Me</a>
                  </div>
                </div>
              </div>
            \`;
          } catch (e) {
            document.getElementById("dashboardRoot").innerHTML = '<div class="card dashboard-full"><div class="muted">Server error while loading dashboard.</div></div>';
          }
        }

        loadDashboard();
      </script>
    </body>
    </html>
  `);
});

app.get("/profile", (req, res) => {
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
        ${navHtml("me")}

        <div class="card">
          <div class="title">Me</div>
          <div class="subtitle">Current demo user profile.</div>

          <div class="stats">
            <div class="stat">
              <div class="stat-label">User ID</div>
              <div class="stat-value">${user.id}</div>
            </div>
            <div class="stat">
              <div class="stat-label">Email</div>
              <div class="stat-value" style="font-size:20px;">${user.email}</div>
            </div>
            <div class="stat">
              <div class="stat-label">Balance</div>
              <div class="stat-value">${user.balance}</div>
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

app.get("/history", (req, res) => {
  const historyHtml = balanceHistory
    .map((item) => {
      return `
        <div class="history-item">
          <div class="history-type">${item.type}</div>
          <div><strong>Description:</strong> ${item.description}</div>
          <div><strong>Amount:</strong> ${item.amount}</div>
          <div><strong>Balance after:</strong> ${item.balance_after}</div>
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
        ${navHtml("history")}

        <div class="card">
          <div class="title">History</div>
          <div class="subtitle">All current balance movements and reward claims.</div>
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

app.get("/matches", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Matches</title>
      <style>${baseStyles()}</style>
    </head>
    <body>
      <div class="wrap">
        ${navHtml("matches")}

        <div class="card">
          <div class="title">Matches</div>
          <div class="subtitle">Choose an outcome, place a bet, then settle pending bets as WIN or LOSE.</div>
        </div>

        <div class="matches-grid">
          <div>
            <div class="card">
              <div id="matchesBox">Loading matches...</div>
            </div>

            <div class="card">
              <div class="title" style="font-size:28px;">My Bets</div>
              <div id="betsBox">Loading bets...</div>
            </div>
          </div>

          <div class="bet-slip">
            <div class="title" style="font-size:28px;">Bet Slip</div>

            <div class="slip-box">
              <div class="muted">Current balance</div>
              <div class="slip-big" id="slipBalance">${user.balance}</div>
            </div>

            <div id="slipEmpty" class="slip-box">
              Select any outcome to prepare your bet.
            </div>

            <div id="slipContent" style="display:none;">
              <div class="slip-box">
                <div class="muted">Selected match</div>
                <div class="slip-big" id="slipMatch">-</div>
                <div class="muted" id="slipSelection">-</div>
                <div style="margin-top:8px;"><strong>Odds:</strong> <span id="slipOdds">-</span></div>
              </div>

              <div class="slip-box">
                <div class="muted">Stake</div>
                <input id="stakeInput" class="input" type="number" min="1" step="1" placeholder="Enter stake" />
                <div><strong>Possible win:</strong> <span id="possibleWin">0</span></div>
              </div>

              <button class="button" style="width:100%;" onclick="placeBet()">Place Bet</button>
            </div>

            <div id="matchesMsg" class="message"></div>
          </div>
        </div>
      </div>

      ${toastScript()}

      <script>
        let selectedBet = null;
        let matches = [];

        function showPageMessage(text, type) {
          const box = document.getElementById("matchesMsg");
          box.className = "message " + type;
          box.style.display = "block";
          box.textContent = text;
        }

        async function loadMatches() {
          const res = await fetch("/api/matches", { cache: "no-store" });
          const data = await res.json();

          if (!data.ok) {
            document.getElementById("matchesBox").innerHTML = "<div class='muted'>Could not load matches.</div>";
            return;
          }

          matches = data.matches || [];

          document.getElementById("matchesBox").innerHTML = matches.map(match => \`
            <div class="match-card">
              <div class="league-pill">\${match.league}</div>
              <div class="match-title">\${match.match_name}</div>
              <div class="odds-grid">
                \${match.outcomes.map(outcome => \`
                  <button class="odds-btn" onclick="selectOutcome(\${match.id}, '\${outcome.selection.replace(/'/g, "\\\\'")}', \${outcome.odds})">
                    \${outcome.selection}<br>\${outcome.odds}
                  </button>
                \`).join("")}
              </div>
            </div>
          \`).join("");
        }

        async function loadMyBets() {
          const res = await fetch("/my-bets", { cache: "no-store" });
          const data = await res.json();

          if (!data.ok) {
            document.getElementById("betsBox").innerHTML = "<div class='muted'>Could not load bets.</div>";
            return;
          }

          const bets = data.bets || [];

          document.getElementById("betsBox").innerHTML = bets.length
            ? '<div class="bets-list">' + bets.map(bet => \`
                <div class="bet-item">
                  <div style="font-size:22px; font-weight:800; margin-bottom:6px;">\${bet.match_name}</div>
                  <div class="muted" style="margin-bottom:8px;">Selection: \${bet.selection}</div>
                  <div><strong>Stake:</strong> \${bet.stake}</div>
                  <div><strong>Odds:</strong> \${bet.odds}</div>
                  <div><strong>Possible win:</strong> \${bet.possible_win}</div>
                  <div class="status-pill \${String(bet.status).toLowerCase()}">\${bet.status}</div>

                  \${String(bet.status).toLowerCase() === "pending" ? \`
                    <div class="settle-actions">
                      <button class="button claim" onclick="settleBet(\${bet.id}, 'win')">WIN</button>
                      <button class="button red" onclick="settleBet(\${bet.id}, 'lose')">LOSE</button>
                    </div>
                  \` : ""}
                </div>
              \`).join("") + '</div>'
            : "<div class='muted'>No bets yet.</div>";
        }

        function selectOutcome(matchId, selection, odds) {
          const match = matches.find(m => m.id === matchId);
          if (!match) return;

          selectedBet = {
            match_name: match.match_name,
            selection,
            odds
          };

          document.getElementById("slipEmpty").style.display = "none";
          document.getElementById("slipContent").style.display = "block";
          document.getElementById("slipMatch").textContent = selectedBet.match_name;
          document.getElementById("slipSelection").textContent = selectedBet.selection;
          document.getElementById("slipOdds").textContent = selectedBet.odds;
          document.getElementById("stakeInput").value = "";
          document.getElementById("possibleWin").textContent = "0";

          document.getElementById("stakeInput").oninput = function() {
            const stake = Number(this.value || 0);
            document.getElementById("possibleWin").textContent = stake > 0 ? (stake * Number(selectedBet.odds)).toFixed(2) : "0";
          };
        }

        async function placeBet() {
          if (!selectedBet) {
            showPageMessage("Please select an outcome first", "error");
            showToast("Select an outcome first", "error");
            return;
          }

          const stake = Number(document.getElementById("stakeInput").value || 0);

          const res = await fetch("/api/place-bet", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              match_name: selectedBet.match_name,
              selection: selectedBet.selection,
              odds: selectedBet.odds,
              stake
            })
          });

          const data = await res.json();

          if (!data.ok) {
            showPageMessage(data.message || "Could not place bet", "error");
            showToast(data.message || "Could not place bet", "error");
            return;
          }

          updateAllBalanceTexts(data.balance);
          document.getElementById("slipBalance").textContent = data.balance;
          document.getElementById("stakeInput").value = "";
          document.getElementById("possibleWin").textContent = "0";
          showPageMessage("Bet placed successfully", "success");
          showToast("Bet placed", "success");
          loadMyBets();
        }

        async function settleBet(betId, result) {
          const res = await fetch("/api/settle-bet", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ betId, result })
          });

          const data = await res.json();

          if (!data.ok) {
            showPageMessage(data.message || "Could not settle bet", "error");
            showToast(data.message || "Could not settle bet", "error");
            return;
          }

          updateAllBalanceTexts(data.balance);
          document.getElementById("slipBalance").textContent = data.balance;
          showPageMessage("Bet settled: " + String(result).toUpperCase(), "success");
          showToast("Bet settled: " + String(result).toUpperCase(), "success");
          loadMyBets();
        }

        loadMatches();
        loadMyBets();
      </script>
    </body>
    </html>
  `);
});

app.get("/health", (req, res) => {
  res.send("ok");
});

app.get("/me", (req, res) => {
  res.json({
    ok: true,
    user
  });
});

app.get("/my-bets", (req, res) => {
  res.json({
    ok: true,
    bets: [...bets].reverse()
  });
});

app.get("/balance-history", (req, res) => {
  res.json({
    ok: true,
    history: balanceHistory
  });
});

app.get("/api/matches", (req, res) => {
  res.json({
    ok: true,
    matches: availableMatches
  });
});

app.post("/api/place-bet", (req, res) => {
  const { match_name, selection, odds, stake } = req.body;

  const numericOdds = Number(odds);
  const numericStake = Number(stake);

  if (!match_name || !selection || !numericOdds || !numericStake) {
    return res.status(400).json({
      ok: false,
      message: "Missing bet data"
    });
  }

  if (numericStake <= 0) {
    return res.status(400).json({
      ok: false,
      message: "Stake must be greater than 0"
    });
  }

  if (numericStake > Number(user.balance)) {
    return res.status(400).json({
      ok: false,
      message: "Not enough balance"
    });
  }

  const possibleWin = Number((numericStake * numericOdds).toFixed(2));

  const newBet = {
    id: nextBetId++,
    match_name,
    selection,
    odds: numericOdds,
    stake: numericStake,
    possible_win: possibleWin,
    status: "pending"
  };

  bets.push(newBet);
  user.balance = Number((Number(user.balance) - numericStake).toFixed(2));

  pushHistory(
    "bet_stake",
    `Stake for ${match_name} / ${selection}`,
    -numericStake,
    user.balance
  );

  res.json({
    ok: true,
    message: "Bet placed",
    bet: newBet,
    balance: user.balance
  });
});

app.post("/api/settle-bet", (req, res) => {
  const betId = Number(req.body.betId || 0);
  const result = String(req.body.result || "").toLowerCase();

  const bet = bets.find((item) => item.id === betId);

  if (!bet) {
    return res.status(404).json({
      ok: false,
      message: "Bet not found"
    });
  }

  if (normalizeStatus(bet.status) !== "pending") {
    return res.status(400).json({
      ok: false,
      message: "Bet is already settled"
    });
  }

  if (result !== "win" && result !== "lose") {
    return res.status(400).json({
      ok: false,
      message: "Invalid result"
    });
  }

  bet.status = result;

  if (result === "win") {
    user.balance = Number((Number(user.balance) + Number(bet.possible_win)).toFixed(2));

    pushHistory(
      "bet_win",
      `Win payout for ${bet.match_name} / ${bet.selection}`,
      Number(bet.possible_win),
      user.balance
    );
  }

  if (result === "lose") {
    pushHistory(
      "bet_lose",
      `Lose settle for ${bet.match_name} / ${bet.selection}`,
      0,
      user.balance
    );
  }

  return res.json({
    ok: true,
    message: "Bet settled",
    bet,
    balance: user.balance
  });
});

app.get("/api/daily-guests", (req, res) => {
  res.json(getDailyGuestData());
});

app.post("/api/daily-guests/claim", (req, res) => {
  const questId = Number(req.body.questId || 0);
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

  if (isQuestClaimed(questId)) {
    return res.status(400).json({
      ok: false,
      message: "Reward already claimed"
    });
  }

  user.balance = Number((Number(user.balance) + Number(quest.reward)).toFixed(2));

  pushHistory(
    "daily_guest_reward",
    `Claim reward for: ${quest.title}`,
    Number(quest.reward),
    user.balance
  );

  claimQuest(questId);

  return res.json({
    ok: true,
    message: "Reward claimed",
    reward: quest.reward,
    balance: user.balance,
    questId
  });
});

app.get("/daily-guests", (req, res) => {
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
        ${navHtml("daily-guests")}

        <div class="card">
          <div class="title">Daily Guests</div>
          <div class="subtitle">Live guest quests based on your real actions on the site.</div>
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
        let previousQuestMap = {};

        function iconForQuest(title) {
          const t = String(title || "").toLowerCase();
          if (t.includes("place")) return "🎯";
          if (t.includes("win")) return "🏆";
          if (t.includes("stake")) return "💰";
          return "⭐";
        }

        function showMessage(text, type) {
          const box = document.getElementById("messageBox");
          box.className = "message " + type;
          box.style.display = "block";
          box.textContent = text;
        }

        function animateQuestStateChanges(quests) {
          quests.forEach(function(q) {
            var prev = previousQuestMap[q.id] || {};
            var el = document.querySelector('[data-quest-id="' + q.id + '"]');
            if (!el) return;

            if (!prev.done && q.done && !q.claimed) {
              el.classList.add("animate-complete");
              setTimeout(function() {
                el.classList.remove("animate-complete");
              }, 700);
            }

            if (!prev.claimed && q.claimed) {
              el.classList.add("animate-claim");
              setTimeout(function() {
                el.classList.remove("animate-claim");
              }, 1000);
            }
          });

          previousQuestMap = {};
          quests.forEach(function(q) {
            previousQuestMap[q.id] = {
              done: q.done,
              claimed: q.claimed
            };
          });
        }

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
              showMessage(data.message || "Could not claim reward", "error");
              showToast(data.message || "Could not claim reward", "error");
              return;
            }

            updateAllBalanceTexts(data.balance);
            showMessage("Reward claimed: +" + data.reward + ". New balance: " + data.balance, "success");
            showToast("+" + data.reward + " claimed", "success");
            loadDailyGuests();
          } catch (error) {
            showMessage("Server error while claiming reward", "error");
            showToast("Server error", "error");
          }
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
                  <div class="quest \${q.claimed ? "claimed-card" : q.done ? "done-card" : ""}" data-quest-id="\${q.id}">
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

            animateQuestStateChanges(data.quests);
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
