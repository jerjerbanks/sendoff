-- One-time fix: tell wrangler that migrations 0001–0008 are already on live D1.
--
-- Every migration so far was run on live as raw SQL (`wrangler d1 execute`),
-- which never records anything, so live D1 has no d1_migrations table at all
-- (checked 2026-11-25). `wrangler d1 migrations apply` would therefore try to
-- re-run 0001 and fail on "table users already exists". This file creates the
-- tracking table exactly as wrangler does and marks 0001–0008 as applied.
-- (On 2026-11-25 every table, column and index from 0001–0008 was confirmed
-- present on live.)
--
-- Run once, on live only:
--   wrangler d1 execute sendoff --remote --file=scripts/resync-d1-migrations.sql
-- Safe to re-run: INSERT OR IGNORE skips names already recorded.
-- Afterwards `npm run db:migrate:list` should say there are no migrations to apply,
-- and from 0009 on, use `npm run db:migrate` instead of raw SQL.
--
-- Do NOT run this on staging; staging gets real `migrations apply` from empty.

CREATE TABLE IF NOT EXISTS "d1_migrations"(
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		name       TEXT UNIQUE,
		applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

INSERT OR IGNORE INTO "d1_migrations" (name) VALUES
  ('0001_init.sql'),
  ('0002_v12.sql'),
  ('0003_v13.sql'),
  ('0004_spec20.sql'),
  ('0005_split_acks.sql'),
  ('0006_indexes.sql'),
  ('0007_sessions.sql'),
  ('0008_rate_hits.sql');
