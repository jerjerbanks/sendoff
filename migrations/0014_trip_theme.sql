-- v7 trip look: the organizer's pick from "What's the vibe?" or Settings → Trip look.
-- Additive only: one nullable column, nothing existing changed or removed.
-- NULL (every existing trip) = the look is derived from the trip's type, name and options, as before.
-- Allowed values: outdoors | golf | beach | party | city | ski (checked in code; anything else reads as NULL).
-- SQLite has no ADD COLUMN IF NOT EXISTS; wrangler's d1_migrations table makes sure this runs once.
ALTER TABLE trips ADD COLUMN theme TEXT;
