-- Spec 2.0.1: paying parties, travelers, age weights, accessibility, co-sleep.
-- Additive only. A party is keyed by its payer's user id (trip_id, payer_user_id),
-- so every v1.3 table that stores a payer's user_id already stores the party.
-- A payer with no traveler rows is read as a party of one adult traveler.

ALTER TABLE trips ADD COLUMN pre_wedding_style TEXT;
ALTER TABLE trips ADD COLUMN split_mode TEXT NOT NULL DEFAULT 'weighted_by_spot';
ALTER TABLE trips ADD COLUMN age_weights TEXT;

-- NULL means this member pays for their own party. Otherwise the payer's user id.
ALTER TABLE trip_members ADD COLUMN party_user_id TEXT;

CREATE TABLE parties (
  trip_id TEXT NOT NULL,
  payer_user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  -- Organizer-only. any | no_share | note_only. Never used to match roommates.
  share_comfort TEXT NOT NULL DEFAULT 'any',
  share_comfort_note TEXT,
  PRIMARY KEY (trip_id, payer_user_id)
);

CREATE TABLE travelers (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL,
  party_user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  age_band TEXT NOT NULL DEFAULT 'adult',
  -- Set when this traveler has an app account.
  user_id TEXT,
  -- Organizer-only. Never shown to another party.
  needs_notes TEXT,
  is_honoree INTEGER NOT NULL DEFAULT 0,
  honoree_role TEXT,
  -- Attached at $0 to a spot the party already claims.
  co_sleep_spot_id TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE traveler_opt_ins (
  cost_item_id TEXT NOT NULL,
  traveler_id TEXT NOT NULL,
  PRIMARY KEY (cost_item_id, traveler_id)
);

ALTER TABLE cost_items ADD COLUMN age_price_adult INTEGER;
ALTER TABLE cost_items ADD COLUMN age_price_teen INTEGER;
ALTER TABLE cost_items ADD COLUMN age_price_child INTEGER;
ALTER TABLE cost_items ADD COLUMN age_price_infant INTEGER;

ALTER TABLE sleep_spots ADD COLUMN ground_floor INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sleep_spots ADD COLUMN no_stairs INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sleep_spots ADD COLUMN accessible_bath INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sleep_spots ADD COLUMN crib_space INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sleep_spots ADD COLUMN reserved_for_user_id TEXT;
-- NULL means the bed-type default: allowed on king or queen.
ALTER TABLE sleep_spots ADD COLUMN co_sleep_allowed INTEGER;
ALTER TABLE sleep_spots ADD COLUMN max_co_sleepers INTEGER;

-- A share between two parties needs the party already in the bed to say yes.
ALTER TABLE spot_requests ADD COLUMN counterpart_opted_in INTEGER NOT NULL DEFAULT 0;
