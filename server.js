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
      max-width: 980px;
      margin: 0 auto;
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
    }

    .button:hover {
      filter: brightness(1.05);
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
      background: rgba(15, 23, 42, 0.72);
      border: 1px solid #273449;
      border-radius: 18px;
      padding: 18px;
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
        <div class="hero">
          <h1>Night Arena</h1>
          <p>
            Demo betting app with daily guest quests, rewards and live progress.
          </p>
        </div>

        <div class="card">
          <div class="title" style="font-size:28px;">Welcome</div>
          <div class="subtitle">
            Main site now opens as a real page instead of plain HOME OK.
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
              <h3>🎯 Daily Guests</h3>
              <p>Open the guest quest page with live status and reward claiming.</p>
              <a class="button" href="/daily-guests">Open Daily Guests</a>
            </div>

            <div class="feature">
              <h3>💚 Health</h3>
              <p>Simple route to check that the server is alive.</p>
              <a class="button gray" href="/health">Open Health</a>
            </div>

            <div class="feature">
              <h3>👤 Me</h3>
              <p>See demo user data in JSON format.</p>
              <a class="button gray" href="/me">Open Me</a>
            </div>

            <div class="feature">
              <h3>📜 Balance History</h3>
              <p>See reward and bet movement data.</p>
              <a class="button gray" href="/balance-history">Open History</a>
            </div>
          </div>
        </div>
      </div>
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
    bets
  });
});

app.get("/balance-history", (req, res) => {
  res.json({
    ok: true,
    history: balanceHistory
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

  user.balance += Number(quest.reward);

  balanceHistory.unshift({
    id: balanceHistory.length + 1,
    type: "daily_guest_reward",
    description: `Claim reward for: ${quest.title}`,
    amount: Number(quest.reward),
    balance_after: user.balance,
    created_at: new Date().toISOString()
  });

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
        <div class="card">
          <div class="title">Daily Guests</div>
          <div class="subtitle">Live guest quests based on current bet data.</div>
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

      <script>
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
              return;
            }

            showMessage("Reward claimed: +" + data.reward + ". New balance: " + data.balance, "success");
            loadDailyGuests();
          } catch (error) {
            showMessage("Server error while claiming reward", "error");
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
                  <div class="quest">
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
