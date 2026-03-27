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
app.get("/api/daily-guests", (req, res) => {
  res.json({
    ok: true,
    quests: [
      {
        id: 1,
        title: "Place 1 bet",
        description: "Make your first bet today.",
        reward: 5,
        done: false
      },
      {
        id: 2,
        title: "Win 1 bet",
        description: "Get one winning bet.",
        reward: 10,
        done: false
      },
      {
        id: 3,
        title: "Stake 20 total",
        description: "Reach total stake of 20.",
        reward: 15,
        done: false
      }
    ]
  });
});

app.get("/daily-guests", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Daily Guests</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <style>
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family: Arial, sans-serif;
          background: linear-gradient(135deg, #0b1020, #111827);
          color: #f3f7ff;
        }

        .container {
          max-width: 960px;
          margin: 0 auto;
          padding: 16px;
        }

        .topbar {
          background: #18233f;
          border: 1px solid #26324d;
          border-radius: 18px;
          padding: 18px;
          margin-bottom: 16px;
        }

        .pill {
          display: inline-block;
          padding: 9px 14px;
          border-radius: 999px;
          background: rgba(59, 130, 246, 0.15);
          border: 1px solid rgba(59, 130, 246, 0.35);
          color: #93c5fd;
          font-weight: bold;
          font-size: 14px;
        }

        .hero {
          background: linear-gradient(135deg, #1d4ed8, #8b5cf6);
          border-radius: 22px;
          padding: 24px;
          margin-bottom: 16px;
        }

        .hero h1 {
          margin: 0 0 10px;
          font-size: 34px;
        }

        .hero p {
          margin: 0;
          color: rgba(255,255,255,0.92);
          line-height: 1.6;
        }

        .card {
          background: #18233f;
          border: 1px solid #26324d;
          border-radius: 18px;
          padding: 18px;
          margin-bottom: 16px;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 14px;
        }

        .quest {
          background: rgba(15, 23, 42, 0.72);
          border: 1px solid #273449;
          border-radius: 18px;
          padding: 18px;
        }

        .quest-icon {
          font-size: 36px;
          margin-bottom: 10px;
        }

        .quest-title {
          font-size: 22px;
          font-weight: 800;
          margin-bottom: 8px;
        }

        .quest-desc {
          color: #94a3b8;
          line-height: 1.5;
          margin-bottom: 14px;
        }

        .reward {
          display: inline-block;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(34, 197, 94, 0.16);
          border: 1px solid rgba(34, 197, 94, 0.35);
          color: #86efac;
          font-weight: bold;
          font-size: 14px;
          margin-bottom: 12px;
        }

        .status {
          display: inline-block;
          padding: 8px 12px;
          border-radius: 999px;
          font-weight: bold;
          font-size: 13px;
        }

        .status.done {
          background: rgba(34, 197, 94, 0.16);
          color: #86efac;
          border: 1px solid rgba(34, 197, 94, 0.35);
        }

        .status.progress {
          background: rgba(245, 158, 11, 0.16);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.35);
        }

        .actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 16px;
        }

        .btn {
          display: inline-block;
          text-decoration: none;
          padding: 12px 16px;
          border-radius: 12px;
          font-weight: bold;
          color: white;
          background: linear-gradient(180deg, #3b82f6, #2563eb);
        }

        .btn.secondary {
          background: linear-gradient(180deg, #475569, #334155);
        }

        .loading {
          color: #94a3b8;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="topbar">
          <span class="pill">🎮 Daily Guest Missions</span>
        </div>

        <div class="hero">
          <h1>Daily Guests</h1>
          <p>
            Complete simple guest missions, earn rewards, and turn the raw JSON
            into a real game-style page.
          </p>
        </div>

        <div class="card">
          <h2 style="margin-top:0;">Today quests</h2>
          <div id="quests" class="loading">Loading quests...</div>

          <div class="actions">
            <a class="btn" href="/daily-guests">Refresh page</a>
            <a class="btn secondary" href="/health">Health</a>
          </div>
        </div>
      </div>

      <script>
        function questIcon(title) {
          if (title.toLowerCase().includes("place")) return "🎯";
          if (title.toLowerCase().includes("win")) return "🏆";
          if (title.toLowerCase().includes("stake")) return "💰";
          return "⭐";
        }

        async function loadQuests() {
          try {
            const res = await fetch("/api/daily-guests");
            const data = await res.json();

            if (!data.ok) {
              document.getElementById("quests").innerHTML = "<p>Could not load quests.</p>";
              return;
            }

            const quests = data.quests || [];

            document.getElementById("quests").innerHTML = \`
              <div class="grid">
                \${quests.map(q => \`
                  <div class="quest">
                    <div class="quest-icon">\${questIcon(q.title)}</div>
                    <div class="quest-title">\${q.title}</div>
                    <div class="quest-desc">\${q.description || ""}</div>
                    <div class="reward">Reward: +\${q.reward}</div>
                    <div>
                      \${q.done
                        ? '<span class="status done">DONE</span>'
                        : '<span class="status progress">IN PROGRESS</span>'}
                    </div>
                  </div>
                \`).join("")}
              </div>
            \`;
          } catch (e) {
            document.getElementById("quests").innerHTML = "<p>Server error while loading quests.</p>";
          }
        }

        loadQuests();
      </script>
    </body>
    </html>
  `);
});

/* START SERVER */
const port = process.env.PORT || 3000;

app.listen(port, "0.0.0.0", () => {
  console.log("Server running on port", port);
});
