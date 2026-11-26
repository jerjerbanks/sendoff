import { index, integer, primaryKey, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  contact: text("contact").notNull(),
  /** 1 once this person has signed in; their contact then no longer signs anyone in. */
  claimed: integer("claimed").notNull().default(0),
});

/** A signed-in browser. The cookie holds a random token; only its SHA-256 hash is stored. */
export const sessions = sqliteTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id").notNull(),
  createdAt: text("created_at").notNull(),
  expiresAt: text("expires_at").notNull(),
  demo: integer("demo").notNull().default(0),
});

/** One-time link a signed-in person makes to sign in on another phone. */
export const signInLinks = sqliteTable("sign_in_links", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id").notNull(),
  tripId: text("trip_id").notNull(),
  createdAt: text("created_at").notNull(),
  expiresAt: text("expires_at").notNull(),
  usedAt: text("used_at"),
});

export const trips = sqliteTable("trips", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  tripType: text("trip_type").notNull(),
  organizerId: text("organizer_id").notNull(),
  guestOfHonorUserId: text("guest_of_honor_user_id").notNull(),
  dateWindow: text("date_window").notNull(),
  status: text("status").notNull(),
  buyInAmount: integer("buy_in_amount").notNull(),
  buyInDeadline: text("buy_in_deadline"),
  minHeadcount: integer("min_headcount").notNull(),
  maxHeadcount: integer("max_headcount").notNull(),
  bedChangePolicy: text("bed_change_policy").notNull(),
  honoreeExcludedFromSplit: integer("honoree_excluded_from_split").notNull(),
  inviteToken: text("invite_token").notNull(),
  simulatedNow: text("simulated_now"),
  bookingConfirmation: text("booking_confirmation"),
  actualLodgingTotal: integer("actual_lodging_total"),
  bookedAt: text("booked_at"),
  preWeddingStyle: text("pre_wedding_style"),
  splitMode: text("split_mode").notNull().default("weighted_by_spot"),
  ageWeights: text("age_weights"),
  pendingSplitMode: text("pending_split_mode"),
  /** Set when the organizer deletes the trip (migration 0011). A deleted trip never loads. */
  deletedAt: text("deleted_at"),
});

/** One per paying party. Keyed by the payer's user id. */
export const parties = sqliteTable(
  "parties",
  {
    tripId: text("trip_id").notNull(),
    payerUserId: text("payer_user_id").notNull(),
    name: text("name").notNull(),
    shareComfort: text("share_comfort").notNull().default("any"),
    shareComfortNote: text("share_comfort_note"),
  },
  (table) => [primaryKey({ columns: [table.tripId, table.payerUserId] })],
);

export const travelers = sqliteTable("travelers", {
  id: text("id").primaryKey(),
  tripId: text("trip_id").notNull(),
  partyUserId: text("party_user_id").notNull(),
  name: text("name").notNull(),
  ageBand: text("age_band").notNull().default("adult"),
  userId: text("user_id"),
  needsNotes: text("needs_notes"),
  isHonoree: integer("is_honoree").notNull().default(0),
  honoreeRole: text("honoree_role"),
  coSleepSpotId: text("co_sleep_spot_id"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const travelerOptIns = sqliteTable(
  "traveler_opt_ins",
  {
    costItemId: text("cost_item_id").notNull(),
    travelerId: text("traveler_id").notNull(),
  },
  (table) => [primaryKey({ columns: [table.costItemId, table.travelerId] })],
);

export const sleepSpots = sqliteTable("sleep_spots", {
  id: text("id").primaryKey(),
  tripId: text("trip_id").notNull(),
  roomName: text("room_name").notNull(),
  bedType: text("bed_type").notNull(),
  privateBath: integer("private_bath").notNull(),
  privateRoom: integer("private_room").notNull(),
  weight: integer("weight_milli").notNull(),
  capacity: integer("capacity").notNull().default(1),
  sharingEnabled: integer("sharing_enabled").notNull(),
  reservedForHonoree: integer("reserved_for_honoree").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  groundFloor: integer("ground_floor").notNull().default(0),
  noStairs: integer("no_stairs").notNull().default(0),
  accessibleBath: integer("accessible_bath").notNull().default(0),
  cribSpace: integer("crib_space").notNull().default(0),
  reservedForUserId: text("reserved_for_user_id"),
  coSleepAllowed: integer("co_sleep_allowed"),
  maxCoSleepers: integer("max_co_sleepers"),
});

export const spotRequests = sqliteTable("spot_requests", {
  id: text("id").primaryKey(),
  tripId: text("trip_id").notNull(),
  type: text("type").notNull(),
  fromSpotId: text("from_spot_id"),
  toSpotId: text("to_spot_id").notNull(),
  requesterUserId: text("requester_user_id").notNull(),
  counterpartUserId: text("counterpart_user_id"),
  counterpartOptedIn: integer("counterpart_opted_in").notNull().default(0),
  status: text("status").notNull(),
  createdAt: text("created_at").notNull(),
});

export const spotClaims = sqliteTable(
  "spot_claims",
  {
    spotId: text("spot_id").notNull(),
    userId: text("user_id").notNull(),
    status: text("status").notNull(),
  },
  (table) => [primaryKey({ columns: [table.spotId, table.userId] })],
);

export const tripMembers = sqliteTable(
  "trip_members",
  {
    tripId: text("trip_id").notNull(),
    userId: text("user_id").notNull(),
    role: text("role").notNull(),
    status: text("status").notNull(),
    committedAt: text("committed_at"),
    partyUserId: text("party_user_id"),
  },
  (table) => [primaryKey({ columns: [table.tripId, table.userId] })],
);

export const polls = sqliteTable("polls", {
  id: text("id").primaryKey(),
  tripId: text("trip_id").notNull(),
  kind: text("kind").notNull(),
  deadline: text("deadline").notNull(),
  lockedOptionId: text("locked_option_id"),
});

export const pollOptions = sqliteTable("poll_options", {
  id: text("id").primaryKey(),
  pollId: text("poll_id").notNull(),
  label: text("label").notNull(),
  estCost: integer("est_cost").notNull(),
  link: text("link").notNull(),
  sortOrder: integer("sort_order").notNull(),
  lodgingEstimate: integer("lodging_estimate"),
  hiddenByOrganizer: integer("hidden_by_organizer").notNull().default(0),
});

export const votes = sqliteTable(
  "votes",
  {
    pollOptionId: text("poll_option_id").notNull(),
    userId: text("user_id").notNull(),
  },
  (table) => [primaryKey({ columns: [table.pollOptionId, table.userId] })],
);

export const costItems = sqliteTable("cost_items", {
  id: text("id").primaryKey(),
  tripId: text("trip_id").notNull(),
  label: text("label").notNull(),
  category: text("category").notNull(),
  splitType: text("split_type").notNull(),
  amount: integer("amount").notNull(),
  memberId: text("member_id"),
  isLodging: integer("is_lodging").notNull(),
  homeAirport: text("home_airport"),
  lowEstimate: integer("low_estimate"),
  highEstimate: integer("high_estimate"),
  agePriceAdult: integer("age_price_adult"),
  agePriceTeen: integer("age_price_teen"),
  agePriceChild: integer("age_price_child"),
  agePriceInfant: integer("age_price_infant"),
});

export const privateBudgets = sqliteTable(
  "private_budgets",
  {
    tripId: text("trip_id").notNull(),
    userId: text("user_id").notNull(),
    maxAllIn: integer("max_all_in").notNull(),
    flexNote: text("flex_note"),
    mustHaves: text("must_haves"),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.tripId, table.userId] })],
);

export const flightQuotes = sqliteTable(
  "flight_quotes",
  {
    userId: text("user_id").notNull(),
    optionId: text("option_id").notNull(),
    highCents: integer("high_cents").notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.optionId] })],
);

export const tripEvents = sqliteTable("trip_events", {
  id: text("id").primaryKey(),
  tripId: text("trip_id").notNull(),
  userId: text("user_id"),
  kind: text("kind").notNull(),
  at: text("at").notNull(),
  detail: text("detail"),
});

/** 0010: tester funnel, one row per member per step per trip. Written only through lib/funnel. */
export const funnelEvents = sqliteTable(
  "funnel_events",
  {
    tripId: text("trip_id").notNull(),
    userId: text("user_id"),
    step: text("step").notNull(),
    at: text("at").notNull(),
  },
  (table) => [unique().on(table.tripId, table.userId, table.step), index("funnel_events_step_at_idx").on(table.step, table.at)],
);

export const costItemParticipants = sqliteTable(
  "cost_item_participants",
  {
    costItemId: text("cost_item_id").notNull(),
    userId: text("user_id").notNull(),
  },
  (table) => [primaryKey({ columns: [table.costItemId, table.userId] })],
);

export const milestones = sqliteTable("milestones", {
  id: text("id").primaryKey(),
  tripId: text("trip_id").notNull(),
  name: text("name").notNull(),
  dueDate: text("due_date").notNull(),
  kind: text("kind").notNull(),
  amountRule: text("amount_rule").notNull(),
  amount: integer("amount").notNull(),
  sortOrder: integer("sort_order").notNull(),
});

export const payments = sqliteTable("payments", {
  id: text("id").primaryKey(),
  milestoneId: text("milestone_id").notNull(),
  userId: text("user_id").notNull(),
  amount: integer("amount").notNull(),
  status: text("status").notNull(),
  paidAt: text("paid_at"),
});

/** One row per committed payer who agreed to the current proposed split mode. */
export const splitModeAcks = sqliteTable(
  "split_mode_acks",
  {
    tripId: text("trip_id").notNull(),
    payerUserId: text("payer_user_id").notNull(),
    proposedMode: text("proposed_mode").notNull(),
    acknowledgedAt: text("acknowledged_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.tripId, table.payerUserId] })],
);

/** Per-room details that aren't per-bed. Only the floor so far, set by the listing import or the organizer. Migration 0009. */
export const sleepRooms = sqliteTable(
  "sleep_rooms",
  {
    tripId: text("trip_id").notNull(),
    roomName: text("room_name").notNull(),
    floor: text("floor"),
  },
  (table) => [primaryKey({ columns: [table.tripId, table.roomName] })],
);
