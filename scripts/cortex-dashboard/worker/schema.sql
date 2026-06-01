CREATE TABLE IF NOT EXISTS ritual_data (
  key TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);
