require("dotenv").config();

const express = require("express");
const cors = require("cors");    const result = await pool.query("SELECT NOW() as now");
    res.json({ ok: true, time: result.rows[0].now });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
});

app.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.json({ ok: false, message: "Email and password required" });
    }

    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length) {
      return res.json({ ok: false, message: "User already exists" });
    }

    const hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email, balance, created_at",
      [email, hash]
    );

    req.session.userId = result.rows[0].id;
    res.json({ ok: true, user: result.rows[0] });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query("SELECT * FROM users WHERE email = $1 LIMIT 1", [email]);
    if (!result.rows.length) {
      return res.json({ ok: false, message: "Invalid credentials" });
    }

    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password);

    if (!ok) {
      return res.json({ ok: false, message: "Invalid credentials" });
    }

    req.session.userId = user.id;
    res.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        balance: user.balance,
        created_at: user.created_at
      }
    });
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
    res.json({ ok: true, user });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
});

app.get("/register", (req, res) => {
  res.send(layout("Register", `
    <div class="card">
      <h1>Create account</h1>
      <input id="email" placeholder="Email" />
      <input id="password" type="password" placeholder="Password" />
      <button onclick="registerUser()">Register</button>
      <pre id="out"></pre>
    </div>

    <script>
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
        document.getElementById("out").textContent = JSON.stringify(data, null, 2);

        if (data.ok) {
          setTimeout(() => window.location.href = "/dashboard", 500);
        }
      }
    </script>
  `));
});

app.get("/login", (req, res) => {
  res.send(layout("Login", `
    <div class="card">
      <h1>Login</h1>
      <input id="email" placeholder="Email" />
      <input id="password" type="password" placeholder="Password" />
      <button onclick="loginUser()">Login</button>
      <pre id="out"></pre>
    </div>

    <script>
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
        document.getElementById("out").textContent = JSON.stringify(data, null, 2);

        if (data.ok) {
          setTimeout(() => window.location.href = "/dashboard", 500);
        }
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

    await pool.query(
      "UPDATE users SET balance = balance - $1 WHERE id = $2",
      [stake, user.id]
    );

    const betResult = await pool.query(
      `INSERT INTO bets (user_id, match_name, selection, odds, stake, possible_win)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [user.id, match_name, selection, odds, stake, possibleWin]
    );

    const bet = betResult.rows[0];

    await pool.query(
      `INSERT INTO balance_history (user_id, amount, type, description, bet_id, balance_after)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        user.id,
        -Math.abs(Number(stake)),
        "bet_stake",
        `Stake for ${match_name} / ${selection}`,
        bet.id,
        newBalance
      ]
    );

    res.json({ ok: true, bet, newBalance });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
});

app.post("/settle-bet", async (req, res) => {
  try {
    const { betId, status } = req.body;

    if (status !== "win" && status !== "lose") {
      return res.json({ ok: false, message: "Invalid status" });
    }

    const betResult = await pool.query("SELECT * FROM bets WHERE id = $1", [betId]);
    if (!betResult.rows.length) {
      return res.json({ ok: false, message: "Bet not found" });
    }

    const bet = betResult.rows[0];

    if (bet.status !== "pending") {
      return res.json({ ok: false, message: "Bet already settled" });
    }

    await pool.query("UPDATE bets SET status = $1 WHERE id = $2", [status, betId]);

    let newBalance = null;

    if (status === "win") {
      await pool.query(
        "UPDATE users SET balance = balance + $1 WHERE id = $2",
        [bet.possible_win, bet.user_id]
      );

      const userResult = await pool.query(
        "SELECT balance FROM users WHERE id = $1",
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
    }

    if (status === "lose") {
      const userResult = await pool.query(
        "SELECT balance FROM users WHERE id = $1",
        [bet.user_id]
      );
      newBalance = Number(userResult.rows[0].balance);
    }

    res.json({ ok: true, message: "Bet settled", newBalance });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
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

app.get("/matches", async (req, res) => {
  const user = await getUser(req);
  if (!user) return res.send(loginRequiredPage("Matches"));

  res.send(layout("Matches", `
    <div class="card">
      <h1>Matches</h1>
      <p class="muted">Choose an outcome and place a bet.</p>
    </div>

    <div class="two-cols">
      <div class="card">
        ${demoMatches.map(match => `
          <div class="match">
            <div class="league">${match.league}</div>
            <h2>${match.team1} vs ${match.team2}</h2>
            <div class="odds">
              <button onclick="selectBet(${match.id}, 'Home', ${match.odds.home})">${match.team1}<br>${match.odds.home}</button>
              <button onclick="selectBet(${match.id}, 'Draw', ${match.odds.draw})">Draw<br>${match.odds.draw}</button>
              <button onclick="selectBet(${match.id}, 'Away', ${match.odds.away})">${match.team2}<br>${match.odds.away}</button>
            </div>
          </div>
        `).join("")}
      </div>

      <div class="card">
        <h2>Bet slip</h2>
        <div class="stat" style="margin-bottom:14px;">
          <div class="label">Current balance</div>
          <div class="value" id="balanceBox">${user.balance}</div>
        </div>

        <div id="emptySlip" class="muted">Choose an outcome first.</div>

        <div id="slipContent" style="display:none;">
          <div class="stat">
            <div class="label">Selected</div>
            <div class="value" style="font-size:18px;" id="slipMatch"></div>
            <div class="muted" id="slipSelection" style="margin-top:8px;"></div>
            <div style="margin-top:8px;"><strong>Odds:</strong> <span id="slipOdds"></span></div>
          </div>

          <input id="slipStake" placeholder="Stake" oninput="updateWin()" />
          <div class="stat">
            <div class="label">Possible win</div>
            <div class="value" id="possibleWin">0</div>
          </div>
          <button onclick="placeBet()">Place bet</button>
        </div>

        <pre id="out"></pre>
      </div>
    </div>

    <script>
      const matches = ${JSON.stringify(demoMatches)};
      let selectedBet = null;

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
      }

      function updateWin() {
        if (!selectedBet) return;
        const stake = Number(document.getElementById("slipStake").value || 0);
        document.getElementById("possibleWin").textContent = stake * selectedBet.odds || 0;
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
        document.getElementById("out").textContent = JSON.stringify(data, null, 2);

        if (data.ok) {
          document.getElementById("balanceBox").textContent = data.newBalance;
        }
      }
    </script>
  `));
});

app.get("/dashboard", async (req, res) => {
  const user = await getUser(req);
  if (!user) return res.send(loginRequiredPage("Dashboard"));

  res.send(layout("Dashboard", `
    <div class="card">
      <h1>My dashboard</h1>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <button onclick="loadDashboard()" style="width:auto;">Refresh dashboard</button>
        <button onclick="logoutUser()" style="width:auto; background:#475569;">Logout</button>
      </div>
    </div>

    <div id="dashboardContent" class="card">Loading...</div>

    <script>
      async function loadDashboard() {
        const meRes = await fetch("/me", { credentials: "include" });
        const meData = await meRes.json();

        const betsRes = await fetch("/api/my-bets", { credentials: "include" });
        const betsData = await betsRes.json();

        const historyRes = await fetch("/api/balance-history", { credentials: "include" });
        const historyData = await historyRes.json();

        if (!meData.ok || !betsData.ok) {
          document.getElementById("dashboardContent").innerHTML = "Error loading dashboard";
          return;
        }

        const bets = betsData.bets || [];
        const history = historyData.ok ? historyData.history || [] : [];

        const pending = bets.filter(b => b.status === "pending").length;
        const wins = bets.filter(b => b.status === "win").length;
        const loses = bets.filter(b => b.status === "lose").length;
        const totalStaked = bets.reduce((s, b) => s + Number(b.stake || 0), 0);
        const totalWon = history
          .filter(h => h.type === "bet_win")
          .reduce((s, h) => s + Number(h.amount || 0), 0);
        const profit = totalWon - totalStaked;

        document.getElementById("dashboardContent").innerHTML = \`
          <h2>Account</h2>
          <div class="row">
            <div class="stat"><div class="label">Email</div><div class="value" style="font-size:18px;">\${meData.user.email}</div></div>
            <div class="stat"><div class="label">Balance</div><div class="value">\${meData.user.balance}</div></div>
            <div class="stat"><div class="label">User ID</div><div class="value">\${meData.user.id}</div></div>
          </div>

          <h2 style="margin-top:24px;">My stats</h2>
          <div class="row">
            <div class="stat"><div class="label">Total bets</div><div class="value">\${bets.length}</div></div>
            <div class="stat"><div class="label">Pending</div><div class="value">\${pending}</div></div>
            <div class="stat"><div class="label">Wins</div><div class="value">\${wins}</div></div>
            <div class="stat"><div class="label">Loses</div><div class="value">\${loses}</div></div>
            <div class="stat"><div class="label">Total staked</div><div class="value">\${totalStaked}</div></div>
            <div class="stat"><div class="label">Profit</div><div class="value">\${profit}</div></div>
          </div>

          <h2 style="margin-top:24px;">My bets</h2>
          \${bets.length === 0 ? "<p>No bets yet.</p>" : bets.map(b => \`
            <div class="bet \${b.status}-box bet-row">
              <div class="bet-title">\${b.match_name}</div>
              <div class="bet-meta">Selection: \${b.selection}</div>
              <div><strong>ID:</strong> \${b.id}</div>
              <div><strong>Odds:</strong> \${b.odds}</div>
              <div><strong>Stake:</strong> \${b.stake}</div>
              <div><strong>Possible win:</strong> \${b.possible_win}</div>
              <div><span class="status \${b.status}">\${b.status}</span></div>
            </div>
          \`).join("")}
        \`;
      }

      async function logoutUser() {
        await fetch("/logout", {
          method: "POST",
          credentials: "include"
        });
        window.location.href = "/login";
      }

      loadDashboard();
    </script>
  `));
});

app.get("/balance-history", async (req, res) => {
  const user = await getUser(req);
  if (!user) return res.send(loginRequiredPage("Balance history"));

  res.send(layout("Balance history", `
    <div class="card">
      <h1>Balance history</h1>
      <button onclick="loadHistory()" style="width:auto;">Refresh history</button>
    </div>

    <div id="historyContent" class="card">Loading...</div>

    <script>
      async function loadHistory() {
        const res = await fetch("/api/balance-history", {
          credentials: "include"
        });
        const data = await res.json();

        if (!data.ok) {
          document.getElementById("historyContent").innerHTML = "Could not load history";
          return;
        }

        const rows = data.history || [];

        document.getElementById("historyContent").innerHTML = \`
          <h2>Entries</h2>
          \${rows.length === 0 ? "<p>No balance changes yet.</p>" : rows.map(r => \`
            <div class="history-row">
              <div><strong>Type:</strong> \${r.type}</div>
              <div><strong>Description:</strong> \${r.description || "-"}</div>
              <div><strong>Bet ID:</strong> \${r.bet_id || "-"}</div>
              <div><strong>Amount:</strong> <span class="\${Number(r.amount) >= 0 ? "amount-plus" : "amount-minus"}">\${r.amount}</span></div>
              <div><strong>Balance after:</strong> \${r.balance_after}</div>
              <div><strong>Created:</strong> \${r.created_at}</div>
            </div>
          \`).join("")}
        \`;
      }

      loadHistory();
    </script>
  `));
});

app.get("/admin", (req, res) => {
  res.send(layout("Admin", `
    <div class="card">
      <h1>Admin panel</h1>
      <button onclick="loadBets()" style="width:auto;">Refresh bets</button>
      <div id="betsBox" style="margin-top:16px;"></div>
    </div>

    <script>
      async function settleBet(betId, status) {
        const res = await fetch("/settle-bet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ betId, status })
        });

        const data = await res.json();
        alert(JSON.stringify(data, null, 2));
        loadBets();
      }

      async function loadBets() {
        const res = await fetch("/bets", { credentials: "include" });
        const data = await res.json();

        if (!data.ok) {
          document.getElementById("betsBox").innerHTML = "Error loading bets";
          return;
        }

        if (!data.bets.length) {
          document.getElementById("betsBox").innerHTML = "No bets yet";
          return;
        }

        document.getElementById("betsBox").innerHTML = data.bets.map(b => \`
          <div class="bet-row">
            <div><strong>ID:</strong> \${b.id}</div>
            <div><strong>User:</strong> \${b.email || b.user_id}</div>
            <div><strong>Match:</strong> \${b.match_name}</div>
            <div><strong>Selection:</strong> \${b.selection}</div>
            <div><strong>Odds:</strong> \${b.odds}</div>
            <div><strong>Stake:</strong> \${b.stake}</div>
            <div><strong>Possible win:</strong> \${b.possible_win}</div>
            <div><strong>Status:</strong> \${b.status}</div>
            <div style="display:flex; gap:10px; margin-top:10px; flex-wrap:wrap;">
              <button onclick="settleBet(\${b.id}, 'win')" style="width:auto; background:#16a34a;">WIN</button>
              <button onclick="settleBet(\${b.id}, 'lose')" style="width:auto; background:#dc2626;">LOSE</button>
            </div>
          </div>
        \`).join("");
      }

      loadBets();
    </script>
  `));
});

app.get("/users", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, email, balance, created_at FROM users ORDER BY id DESC"
    );
    res.json({ ok: true, users: result.rows });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
});

app.get("/bets", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT bets.*, users.email
      FROM bets
      LEFT JOIN users ON users.id = bets.user_id
      ORDER BY bets.id DESC
    `);
    res.json({ ok: true, bets: result.rows });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
});

app.get("/test-register", (req, res) => res.redirect("/register"));
app.get("/test-login", (req, res) => res.redirect("/login"));
app.get("/test-bet", (req, res) => res.redirect("/matches"));
app.get("/test-settle", (req, res) => res.redirect("/admin"));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("Server started on port", port);
});
