require("dotenv").config();

const express = require("express");
const cors = require("cors");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const pool = require("./db");

const app = express();
const ADMIN_EMAIL = "admin@test.com";

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
  })
);

const demoMatches = [
  { id: 1, team1: "Real Madrid", team2: "Barcelona", league: "La Liga", odds: { home: 2.1, draw: 3.5, away: 3.0 }},
  { id: 2, team1: "Man City", team2: "Liverpool", league: "Premier League", odds: { home: 1.9, draw: 3.8, away: 3.4 }},
  { id: 3, team1: "Bayern", team2: "Dortmund", league: "Bundesliga", odds: { home: 1.7, draw: 4.0, away: 4.5 }}
];

async function getUser(req) {
  if (!req.session.userId) return null;
  const r = await pool.query("SELECT * FROM users WHERE id=$1", [req.session.userId]);
  return r.rows[0] || null;
}

function page(title, content) {
  return `
  <html>
  <head>
    <title>${title}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <style>
      body {
        margin:0;
        font-family: Arial;
        background: linear-gradient(135deg,#0b1020,#111827);
        color:#f3f7ff;
      }

      .container { max-width:1100px;margin:auto;padding:16px; }

      .card {
        background:#121a2f;
        border-radius:20px;
        padding:20px;
        margin-bottom:16px;
        box-shadow:0 0 20px rgba(0,0,0,0.4);
      }

      .hero {
        background:linear-gradient(135deg,#1d4ed8,#8b5cf6);
        padding:30px;
        border-radius:25px;
        margin-bottom:20px;
      }

      h1 { margin:0 0 10px; }

      .nav a {
        color:#94a3b8;
        margin-right:10px;
        text-decoration:none;
      }

      .nav a:hover { color:#fff; }

      button {
        padding:12px;
        border:none;
        border-radius:14px;
        font-weight:bold;
        cursor:pointer;
        margin-top:6px;
      }

      .btn-blue { background:#3b82f6;color:white; }
      .btn-green { background:#22c55e;color:white; }
      .btn-red { background:#ef4444;color:white; }

      .match {
        padding:16px;
        border-radius:18px;
        background:#18233f;
        margin-bottom:12px;
      }

      .odds button {
        width:100%;
        margin-top:6px;
      }

      input {
        width:100%;
        padding:12px;
        border-radius:12px;
        border:none;
        margin-top:8px;
      }

      .glow {
        box-shadow:0 0 10px #3b82f6;
      }

      .status {
        padding:6px 10px;
        border-radius:10px;
        display:inline-block;
        margin-top:10px;
      }

      .win { background:#22c55e; }
      .lose { background:#ef4444; }
      .pending { background:#f59e0b; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="nav">
        <a href="/">Home</a>
        <a href="/matches">Matches</a>
        <a href="/dashboard">Dashboard</a>
        <a href="/login">Login</a>
      </div>

      ${content}
    </div>
  </body>
  </html>
  `;
}

app.get("/", async (req,res)=>{
  res.send(page("Home",`
    <div class="hero">
      <h1>🎮 Dark Betting Simulator</h1>
      <p>Train your predictions. No real money.</p>
    </div>
  `));
});

app.get("/matches", async (req,res)=>{
  const user = await getUser(req);
  if(!user) return res.redirect("/login");

  res.send(page("Matches",`
    <div class="card">
      <h1>Matches</h1>
    </div>

    ${demoMatches.map(m=>`
      <div class="match">
        <b>${m.team1} vs ${m.team2}</b><br/>
        <small>${m.league}</small>

        <div class="odds">
          <button class="btn-blue" onclick="bet('${m.team1} win',${m.odds.home})">${m.odds.home}</button>
          <button class="btn-green" onclick="bet('Draw',${m.odds.draw})">${m.odds.draw}</button>
          <button class="btn-red" onclick="bet('${m.team2} win',${m.odds.away})">${m.odds.away}</button>
        </div>
      </div>
    `).join("")}

    <div class="card">
      <h2>Bet Slip</h2>
      <div id="selected"></div>
      <input id="stake" placeholder="Stake"/>
      <div id="win">Win: 0</div>
      <button onclick="place()">Place Bet</button>
    </div>

    <script>
      let sel=null;

      function bet(name,odds){
        sel={name,odds};
        document.getElementById("selected").innerText=name+" ("+odds+")";
      }

      function place(){
        fetch("/place-bet",{method:"POST",headers:{'Content-Type':'application/json'},credentials:'include',
          body:JSON.stringify({
            match_name:sel.name,
            selection:sel.name,
            odds:sel.odds,
            stake:document.getElementById("stake").value
          })
        }).then(r=>r.json()).then(d=>{
          alert(d.ok?"Placed":"Error");
        });
      }
    </script>
  `));
});

app.post("/register", async (req,res)=>{
  const {email,password}=req.body;
  const hash=await bcrypt.hash(password,10);
  const r=await pool.query("INSERT INTO users(email,password) VALUES($1,$2) RETURNING *",[email,hash]);
  req.session.userId=r.rows[0].id;
  res.json({ok:true});
});

app.post("/login", async (req,res)=>{
  const {email,password}=req.body;
  const r=await pool.query("SELECT * FROM users WHERE email=$1",[email]);
  if(!r.rows.length) return res.json({ok:false});
  const ok=await bcrypt.compare(password,r.rows[0].password);
  if(!ok) return res.json({ok:false});
  req.session.userId=r.rows[0].id;
  res.json({ok:true});
});

app.get("/login",(req,res)=>{
  res.send(page("Login",`
    <div class="card">
      <h1>Login</h1>
      <input id="email" placeholder="email"/>
      <input id="pass" type="password"/>
      <button onclick="go()">Login</button>
    </div>

    <script>
      function go(){
        fetch("/login",{method:"POST",headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          email:email.value,
          password:pass.value
        })}).then(r=>r.json()).then(d=>{
          if(d.ok) location="/matches";
        });
      }
    </script>
  `));
});

app.post("/place-bet", async (req,res)=>{
  const user=await getUser(req);
  if(!user) return res.json({ok:false});

  const {match_name,selection,odds,stake}=req.body;
  const win=odds*stake;

  await pool.query("INSERT INTO bets(user_id,match_name,selection,odds,stake,possible_win) VALUES($1,$2,$3,$4,$5,$6)",
  [user.id,match_name,selection,odds,stake,win]);

  res.json({ok:true});
});

app.get("/dashboard", async (req,res)=>{
  const user=await getUser(req);
  if(!user) return res.redirect("/login");

  const bets=await pool.query("SELECT * FROM bets WHERE user_id=$1",[user.id]);

  res.send(page("Dashboard",`
    <div class="card">
      <h1>Dashboard</h1>
      ${bets.rows.map(b=>`
        <div>
          ${b.match_name} - ${b.selection}
          <div class="status ${b.status}">${b.status}</div>
        </div>
      `).join("")}
    </div>
  `));
});

const port = process.env.PORT || 3000;
app.listen(port,()=>console.log("Running"));
