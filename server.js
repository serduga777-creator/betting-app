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

function normalizeStatus(status) {
  return String(status || "").trim().toLowerCase();
}

function getDailyGuestData() {
  const totalBets = bets.length;
  const totalWins = bets.filter((bet) => normalizeStatus(bet.status) === "win").length;
  const totalStake = bets.reduce((sum, bet) => sum + Number(bet.stake || 0), 0);

  return {
    ok: true,
    user,
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

app.get("/", (req, res) => {
  res.send("HOME OK");
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

app.get("/daily-guests", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Daily Guests</title>
      <style>
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

        .muted {
          color: #94a3b8;
        }

        .loading {
          color: #94a3b8;
        }
      </style>
    </head>
    <body>
      <div class="wrap">
        <div class="card">
          <div class="title">Daily Guests</div>
          <div class="subtitle">Live guest quests based on current bet data.</div>
          <button class="button" onclick="loadDailyGuests()">Refresh quests</button>
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
                      \${q.done
                        ? '<span class="pill done">DONE</span>'
                        : '<span class="pill todo">IN PROGRESS</span>'}
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
