-- v1.7: each committed payer acknowledges a proposed split-mode change.
-- Additive only. Apply as raw SQL (this project has no d1_migrations table).

ALTER TABLE trips ADD COLUMN pending_split_mode TEXT;

CREATE TABLE split_mode_acks (
  trip_id TEXT NOT NULL,
  payer_user_id TEXT NOT NULL,
  proposed_mode TEXT NOT NULL,
  acknowledged_at TEXT NOT NULL,
  PRIMARY KEY (trip_id, payer_user_id)
);
