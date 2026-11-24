ALTER TABLE sleep_spots ADD COLUMN capacity INTEGER NOT NULL DEFAULT 1;
ALTER TABLE sleep_spots ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

CREATE TABLE spot_requests (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL,
  type TEXT NOT NULL,
  from_spot_id TEXT,
  to_spot_id TEXT NOT NULL,
  requester_user_id TEXT NOT NULL,
  counterpart_user_id TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
);
