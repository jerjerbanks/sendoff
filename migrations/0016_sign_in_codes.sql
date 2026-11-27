-- Email sign-in codes: someone whose trip is on another phone (or a cleared browser)
-- gets a 6-digit code by email and signs back in. Additive only, safe to re-run.
-- ticket_hash: SHA-256 of a random ticket kept in this browser's cookie, so a code only
-- works in the browser that asked for it. code_hash: SHA-256 of ticket + code. Neither
-- the ticket nor the code is stored as is.
CREATE TABLE IF NOT EXISTS sign_in_codes (
  ticket_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  user_id TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  used_at TEXT
);
CREATE INDEX IF NOT EXISTS sign_in_codes_email ON sign_in_codes (email, created_at);
