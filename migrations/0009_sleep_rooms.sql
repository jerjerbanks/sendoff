-- Field Trip 0009: room floors for the Airbnb bed import. Additive only.
-- Beds live in sleep_spots, grouped into rooms by room_name; a room's floor
-- ("Main level", "Upstairs") is stored once here. No existing rows change.
-- Safe to re-run as raw SQL on the live D1 (IF NOT EXISTS).
CREATE TABLE IF NOT EXISTS sleep_rooms (
  trip_id TEXT NOT NULL,
  room_name TEXT NOT NULL,
  floor TEXT,
  PRIMARY KEY (trip_id, room_name)
);
