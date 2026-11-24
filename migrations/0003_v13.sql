ALTER TABLE poll_options ADD COLUMN lodging_estimate INTEGER;
ALTER TABLE poll_options ADD COLUMN hidden_by_organizer INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cost_items ADD COLUMN home_airport TEXT;
ALTER TABLE cost_items ADD COLUMN low_estimate INTEGER;
ALTER TABLE cost_items ADD COLUMN high_estimate INTEGER;

CREATE TABLE private_budgets (
  trip_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  max_all_in INTEGER NOT NULL,
  flex_note TEXT,
  must_haves TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (trip_id, user_id)
);

CREATE TABLE flight_quotes (
  user_id TEXT NOT NULL,
  option_id TEXT NOT NULL,
  high_cents INTEGER NOT NULL,
  PRIMARY KEY (user_id, option_id)
);

CREATE TABLE trip_events (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL,
  user_id TEXT,
  kind TEXT NOT NULL,
  at TEXT NOT NULL,
  detail TEXT
);
