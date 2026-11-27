-- Organizer approval of new joiners (feedback sheet "Invite Admin").
-- Additive only: one new trips column (0 = anyone with the link joins, as before)
-- and one new table. Nothing existing is changed or removed.
ALTER TABLE trips ADD COLUMN approve_joiners INTEGER NOT NULL DEFAULT 0;

-- Someone who opened the invite while approval is on. They are NOT a trip member
-- until the organizer lets them in, so they never see trip data.
-- status: 'pending' | 'approved' | 'declined'.
CREATE TABLE join_requests (
  trip_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  decided_at TEXT,
  PRIMARY KEY (trip_id, user_id)
);
CREATE INDEX join_requests_trip_status_idx ON join_requests (trip_id, status);
