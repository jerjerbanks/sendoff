-- Demo Narratives v1: a vote option can show what each person pays if it wins (a green fee).
-- Additive only: one nullable column, nothing existing changed or removed.
-- NULL (every existing option) = no per-person price shown, as before.
-- SQLite has no ADD COLUMN IF NOT EXISTS; wrangler's d1_migrations table makes sure this runs once.
ALTER TABLE poll_options ADD COLUMN per_person_cents INTEGER;
