const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Database
const db = new Database("talon.db");

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    password_hash TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    home_team TEXT NOT NULL,
    away_team TEXT NOT NULL,
    home_score TEXT DEFAULT "-",
    away_score TEXT DEFAULT "-",
    date TEXT DEFAULT "",
    status TEXT DEFAULT "برگزار نشده"
  );

  CREATE TABLE IF NOT EXISTS standings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team TEXT NOT NULL,
    played INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    draws INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    goals_for INTEGER DEFAULT 0,
    goals_against INTEGER DEFAULT 0,
    points INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS honors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    points INTEGER DEFAULT 0
  );
`);

// Create admin password if there is no admin
const adminCount = db.prepare("SELECT COUNT(*) AS count FROM admins").get().count;

if (adminCount === 0) {
  const password = process.env.ADMIN_PASSWORD || "CHANGE_ME";
  const hash = bcrypt.hashSync(password, 12);

  db.prepare(
    "INSERT INTO admins (password_hash) VALUES (?)"
  ).run(hash);
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret:
      process.env.SESSION_SECRET ||
      "CHANGE_THIS_SESSION_SECRET_TO_A_LONG_RANDOM_VALUE",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false
    }
  })
);

// Static files
app.use(express.static(path.join(__dirname, "public")));

// --------------------
// AUTH
// --------------------

app.post("/api/login", async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        error: "رمز عبور وارد نشده است."
      });
    }

    const admin = db
      .prepare("SELECT * FROM admins ORDER BY id LIMIT 1")
      .get();

    if (!admin) {
      return res.status(500).json({
        error: "حساب مدیریت پیدا نشد."
      });
    }

    const correct = await bcrypt.compare(
      password,
      admin.password_hash
    );

    if (!correct) {
      return res.status(401).json({
        error: "رمز عبور اشتباه است."
      });
    }

    req.session.isAdmin = true;

    res.json({
      success: true,
      message: "ورود موفق بود."
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "خطای سرور."
    });
  }
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({
      success: true
    });
  });
});

app.get("/api/me", (req, res) => {
  res.json({
    isAdmin: req.session.isAdmin === true
  });
});

function requireAdmin(req, res, next) {
  if (!req.session.isAdmin) {
    return res.status(403).json({
      error: "دسترسی فقط برای مدیر مجاز است."
    });
  }

  next();
}

// --------------------
// NEWS
// --------------------

app.get("/api/news", (req, res) => {
  const rows = db
    .prepare("SELECT * FROM news ORDER BY id DESC")
    .all();

  res.json(rows);
});

app.post("/api/news", requireAdmin, (req, res) => {
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({
      error: "عنوان و متن خبر الزامی است."
    });
  }

  const result = db
    .prepare(
      "INSERT INTO news (title, content) VALUES (?, ?)"
    )
    .run(title, content);

  res.json({
    success: true,
    id: result.lastInsertRowid
  });
});

app.put("/api/news/:id", requireAdmin, (req, res) => {
  const { title, content } = req.body;

  db.prepare(
    "UPDATE news SET title = ?, content = ? WHERE id = ?"
  ).run(title, content, req.params.id);

  res.json({
    success: true
  });
});

app.delete("/api/news/:id", requireAdmin, (req, res) => {
  db.prepare(
    "DELETE FROM news WHERE id = ?"
  ).run(req.params.id);

  res.json({
    success: true
  });
});

// --------------------
// GAMES
// --------------------

app.get("/api/games", (req, res) => {
  const rows = db
    .prepare("SELECT * FROM games ORDER BY id DESC")
    .all();

  res.json(rows);
});

app.post("/api/games", requireAdmin, (req, res) => {
  const {
    home_team,
    away_team,
    home_score,
    away_score,
    date,
    status
  } = req.body;

  if (!home_team || !away_team) {
    return res.status(400).json({
      error: "نام دو تیم الزامی است."
    });
  }

  const result = db
    .prepare(`
      INSERT INTO games
      (home_team, away_team, home_score, away_score, date, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    .run(
      home_team,
      away_team,
      home_score || "-",
      away_score || "-",
      date || "",
      status || "برگزار نشده"
    );

  res.json({
    success: true,
    id: result.lastInsertRowid
  });
});

app.put("/api/games/:id", requireAdmin, (req, res) => {
  const {
    home_team,
    away_team,
    home_score,
    away_score,
    date,
    status
  } = req.body;

  db.prepare(`
    UPDATE games
    SET
      home_team = ?,
      away_team = ?,
      home_score = ?,
      away_score = ?,
      date = ?,
      status = ?
    WHERE id = ?
  `).run(
    home_team,
    away_team,
    home_score,
    away_score,
    date || "",
    status || "برگزار نشده",
    req.params.id
  );

  res.json({
    success: true
  });
});

app.delete("/api/games/:id", requireAdmin, (req, res) => {
  db.prepare(
    "DELETE FROM games WHERE id = ?"
  ).run(req.params.id);

  res.json({
    success: true
  });
});

// --------------------
// STANDINGS
// --------------------

app.get("/api/standings", (req, res) => {
  const rows = db
    .prepare(`
      SELECT * FROM standings
      ORDER BY points DESC, wins DESC
    `)
    .all();

  res.json(rows);
});

app.post("/api/standings", requireAdmin, (req, res) => {
  const {
    team,
    played,
    wins,
    draws,
    losses,
    goals_for,
    goals_against,
    points
  } = req.body;

  if (!team) {
    return res.status(400).json({
      error: "نام تیم الزامی است."
    });
  }

  const result = db
    .prepare(`
      INSERT INTO standings
      (team, played, wins, draws, losses, goals_for, goals_against, points)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      team,
      played || 0,
      wins || 0,
      draws || 0,
      losses || 0,
      goals_for || 0,
      goals_against || 0,
      points || 0
    );

  res.json({
    success: true,
    id: result.lastInsertRowid
  });
});

app.put("/api/standings/:id", requireAdmin, (req, res) => {
  const {
    team,
    played,
    wins,
    draws,
    losses,
    goals_for,
    goals_against,
    points
  } = req.body;

  db.prepare(`
    UPDATE standings
    SET
      team = ?,
      played = ?,
      wins = ?,
      draws = ?,
      losses = ?,
      goals_for = ?,
      goals_against = ?,
      points = ?
    WHERE id = ?
  `).run(
    team,
    played || 0,
    wins || 0,
    draws || 0,
    losses || 0,
    goals_for || 0,
    goals_against || 0,
    points || 0,
    req.params.id
  );

  res.json({
    success: true
  });
});

app.delete("/api/standings/:id", requireAdmin, (req, res) => {
  db.prepare(
    "DELETE FROM standings WHERE id = ?"
  ).run(req.params.id);

  res.json({
    success: true
  });
});

// --------------------
// HONORS
// --------------------

app.get("/api/honors", (req, res) => {
  const rows = db
    .prepare(`
      SELECT * FROM honors
      ORDER BY points DESC, name ASC
    `)
    .all();

  res.json(rows);
});

app.post("/api/honors", requireAdmin, (req, res) => {
  const { name, points } = req.body;

  if (!name) {
    return res.status(400).json({
      error: "نام مربی الزامی است."
    });
  }

  const result = db
    .prepare(
      "INSERT INTO honors (name, points) VALUES (?, ?)"
    )
    .run(name, Number(points) || 0);

  res.json({
    success: true,
    id: result.lastInsertRowid
  });
});

app.put("/api/honors/:id", requireAdmin, (req, res) => {
  const { name, points } = req.body;

  db.prepare(
    "UPDATE honors SET name = ?, points = ? WHERE id = ?"
  ).run(
    name,
    Number(points) || 0,
    req.params.id
  );

  res.json({
    success: true
  });
});

app.delete("/api/honors/:id", requireAdmin, (req, res) => {
  db.prepare(
    "DELETE FROM honors WHERE id = ?"
  ).run(req.params.id);

  res.json({
    success: true
  });
});

// --------------------
// 404
// --------------------

app.use((req, res) => {
  res.status(404).send("TALON - Page not found");
});

// --------------------
// START SERVER
// --------------------

app.listen(PORT, "0.0.0.0", () => {
  console.log(`TALON running on port ${PORT}`);
});
