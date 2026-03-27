const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("HOME OK");
});

app.get("/health", (req, res) => {
  res.send("ok");
});

app.get("/daily-guests", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Daily Guests</title>
      <style>
        body {
          margin: 0;
          font-family: Arial, sans-serif;
          background: #0b1020;
          color: white;
          padding: 20px;
        }
        .card {
          max-width: 900px;
          margin: 0 auto;
          background: #18233f;
          border: 1px solid #26324d;
          border-radius: 20px;
          padding: 20px;
        }
        .title {
          font-size: 32px;
          font-weight: 800;
          margin-bottom: 12px;
        }
        .muted {
          color: #94a3b8;
          margin-bottom: 20px;
        }
        .grid {
          display: grid;
          gap: 14px;
        }
        .quest {
          background: rgba(15, 23, 42, 0.72);
          border: 1px solid #273449;
          border-radius: 16px;
          padding: 16px;
        }
        .reward {
          display: inline-block;
          margin-top: 10px;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(34,197,94,.16);
          border: 1px solid rgba(34,197,94,.35);
          color: #86efac;
          font-weight: bold;
        }
        .status {
          display: inline-block;
          margin-top: 10px;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(245,158,11,.16);
          border: 1px solid rgba(245,158,11,.35);
          color: #fbbf24;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="title">Daily Guests</div>
        <div class="muted">Guest daily missions page is working.</div>

        <div class="grid">
          <div class="quest">
            <h3>🎯 Place 1 bet</h3>
            <div>Make your first bet today.</div>
            <div class="reward">Reward: +5</div>
            <div class="status">IN PROGRESS</div>
          </div>

          <div class="quest">
            <h3>🏆 Win 1 bet</h3>
            <div>Get one winning bet.</div>
            <div class="reward">Reward: +10</div>
            <div class="status">IN PROGRESS</div>
          </div>

          <div class="quest">
            <h3>💰 Stake 20 total</h3>
            <div>Reach total stake of 20.</div>
            <div class="reward">Reward: +15</div>
            <div class="status">IN PROGRESS</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `);
});

const port = process.env.PORT || 3000;

app.listen(port, "0.0.0.0", () => {
  console.log("Server running on port", port);
});
