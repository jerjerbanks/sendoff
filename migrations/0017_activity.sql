-- Field Trip 0017: lightweight usage for the operator's /admin page. Additive only, safe to re-run.
-- Nothing in the app reads these tables except /admin.

-- Time in the app. A signed-in browser sends one small ping a minute while the tab is
-- visible and the person has touched it recently. One row per person per trip per day
-- (trip_id '' = pages outside a trip), so a busy tester adds one upsert a minute, never a
-- row per page view. seconds is capped per ping on the server, so a stuck tab can't inflate it.
CREATE TABLE IF NOT EXISTS activity_days (
  user_id TEXT NOT NULL,
  trip_id TEXT NOT NULL DEFAULT '',
  day TEXT NOT NULL,
  seconds INTEGER NOT NULL DEFAULT 0,
  pings INTEGER NOT NULL DEFAULT 0,
  first_at TEXT NOT NULL,
  last_at TEXT NOT NULL,
  PRIMARY KEY (user_id, trip_id, day)
);
CREATE INDEX IF NOT EXISTS activity_days_trip_idx ON activity_days (trip_id);

-- Invite link opens, counted in the browser (link-preview bots that only fetch the page
-- for its card don't run it) and once per tab. One row per trip per day.
CREATE TABLE IF NOT EXISTS invite_opens (
  trip_id TEXT NOT NULL,
  day TEXT NOT NULL,
  opens INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (trip_id, day)
);
