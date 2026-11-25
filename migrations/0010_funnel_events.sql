-- Field Trip 0010: tester funnel counts. Additive only; old code never reads or writes it.
-- One row per member per step per trip (INSERT OR IGNORE against the unique key), so
-- vote toggles and repeat commits never inflate a count. Demo trips are never written.
-- step: trip_created | member_joined | voted | committed
CREATE TABLE IF NOT EXISTS funnel_events (
  trip_id TEXT NOT NULL,
  user_id TEXT,
  step TEXT NOT NULL,
  at TEXT NOT NULL,
  UNIQUE (trip_id, user_id, step)
);
CREATE INDEX IF NOT EXISTS funnel_events_step_at_idx ON funnel_events (step, at);
