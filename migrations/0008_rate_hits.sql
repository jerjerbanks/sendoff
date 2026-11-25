-- Field Trip 0008: a D1 rate-limit counter. Additive only.
-- Cloudflare's Workers Rate Limiting binding never refused anything on the live
-- Worker (v1.17 logs: 30 joins and 15 new trips from one IP, all allowed), so the
-- join and create actions also count attempts here, per hashed client IP, in
-- fixed one-minute windows. Old windows are deleted as new hits arrive.
CREATE TABLE IF NOT EXISTS rate_hits (
  key TEXT NOT NULL,
  bucket TEXT NOT NULL,
  win INTEGER NOT NULL,
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key, bucket, win)
);
CREATE INDEX IF NOT EXISTS rate_hits_win_idx ON rate_hits (win);
