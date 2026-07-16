-- Optional: Die Aura-API legt diese Struktur automatisch beim ersten Aufruf an.
-- Du kannst das SQL trotzdem vorab in der Cloudflare-D1-Konsole ausführen.

CREATE TABLE IF NOT EXISTS aura_players (
  player_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL UNIQUE,
  score INTEGER NOT NULL DEFAULT 0,
  last_award_at INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS aura_ranking
ON aura_players (score DESC, updated_at ASC, name ASC);
