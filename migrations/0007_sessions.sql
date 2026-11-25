-- Field Trip 0007: real sign-in sessions. Additive only.
-- Before this, the sign-in cookie held the person's id itself, and ids are visible
-- to everyone on a trip, so anyone could become anyone. Now the cookie holds a
-- random token; only its SHA-256 hash is stored here.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  demo INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions (expires_at);

-- One-time links a signed-in person makes to sign themselves in on another phone.
CREATE TABLE IF NOT EXISTS sign_in_links (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  trip_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT
);
CREATE INDEX IF NOT EXISTS sign_in_links_user_idx ON sign_in_links (user_id);

-- 1 once someone has signed in. After that, typing their phone or email on an
-- invite link no longer signs anyone in as them. Existing people start at 0, so
-- each can get back in once with their own contact after this ships.
ALTER TABLE users ADD COLUMN claimed INTEGER NOT NULL DEFAULT 0;
