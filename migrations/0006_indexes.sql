-- Sendoff 0006: lookup indexes. Additive only: no table or row changes.
-- Every page loads one trip by trip_id; without these, each of those reads
-- scans the whole table, so page cost grew with the number of trips on the site.
-- Safe to run as raw SQL on the live D1 (IF NOT EXISTS makes it re-runnable).
CREATE INDEX IF NOT EXISTS polls_trip_idx ON polls (trip_id);
CREATE INDEX IF NOT EXISTS poll_options_poll_idx ON poll_options (poll_id);
CREATE INDEX IF NOT EXISTS cost_items_trip_idx ON cost_items (trip_id);
CREATE INDEX IF NOT EXISTS milestones_trip_idx ON milestones (trip_id);
CREATE INDEX IF NOT EXISTS sleep_spots_trip_idx ON sleep_spots (trip_id);
CREATE INDEX IF NOT EXISTS spot_requests_trip_idx ON spot_requests (trip_id);
CREATE INDEX IF NOT EXISTS travelers_trip_idx ON travelers (trip_id);
CREATE INDEX IF NOT EXISTS trip_events_trip_idx ON trip_events (trip_id);
CREATE INDEX IF NOT EXISTS flight_quotes_option_idx ON flight_quotes (option_id);
