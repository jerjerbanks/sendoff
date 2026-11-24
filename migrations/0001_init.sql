CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT NOT NULL
);

CREATE TABLE trips (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  trip_type TEXT NOT NULL,
  organizer_id TEXT NOT NULL,
  guest_of_honor_user_id TEXT NOT NULL,
  date_window TEXT NOT NULL,
  status TEXT NOT NULL,
  buy_in_amount INTEGER NOT NULL,
  buy_in_deadline TEXT,
  min_headcount INTEGER NOT NULL,
  max_headcount INTEGER NOT NULL,
  bed_change_policy TEXT NOT NULL,
  honoree_excluded_from_split INTEGER NOT NULL,
  invite_token TEXT NOT NULL UNIQUE,
  simulated_now TEXT,
  booking_confirmation TEXT,
  actual_lodging_total INTEGER,
  booked_at TEXT
);

CREATE TABLE sleep_spots (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL,
  room_name TEXT NOT NULL,
  bed_type TEXT NOT NULL,
  private_bath INTEGER NOT NULL,
  private_room INTEGER NOT NULL,
  weight_milli INTEGER NOT NULL,
  sharing_enabled INTEGER NOT NULL,
  reserved_for_honoree INTEGER NOT NULL
);

CREATE TABLE spot_claims (
  spot_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL,
  PRIMARY KEY (spot_id, user_id)
);

CREATE TABLE trip_members (
  trip_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL,
  committed_at TEXT,
  PRIMARY KEY (trip_id, user_id)
);

CREATE TABLE polls (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  deadline TEXT NOT NULL,
  locked_option_id TEXT
);

CREATE TABLE poll_options (
  id TEXT PRIMARY KEY,
  poll_id TEXT NOT NULL,
  label TEXT NOT NULL,
  est_cost INTEGER NOT NULL,
  link TEXT NOT NULL,
  sort_order INTEGER NOT NULL
);

CREATE TABLE votes (
  poll_option_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  PRIMARY KEY (poll_option_id, user_id)
);

CREATE TABLE cost_items (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL,
  label TEXT NOT NULL,
  category TEXT NOT NULL,
  split_type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  member_id TEXT,
  is_lodging INTEGER NOT NULL
);

CREATE TABLE cost_item_participants (
  cost_item_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  PRIMARY KEY (cost_item_id, user_id)
);

CREATE TABLE milestones (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL,
  name TEXT NOT NULL,
  due_date TEXT NOT NULL,
  kind TEXT NOT NULL,
  amount_rule TEXT NOT NULL,
  amount INTEGER NOT NULL,
  sort_order INTEGER NOT NULL
);

CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  milestone_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL,
  paid_at TEXT,
  UNIQUE (milestone_id, user_id)
);
