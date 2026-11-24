import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  contact: text("contact").notNull(),
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
});

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
});

export const spotRequests = sqliteTable("spot_requests", {
  id: text("id").primaryKey(),
  tripId: text("trip_id").notNull(),
  type: text("type").notNull(),
  fromSpotId: text("from_spot_id"),
  toSpotId: text("to_spot_id").notNull(),
  requesterUserId: text("requester_user_id").notNull(),
  counterpartUserId: text("counterpart_user_id"),
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
});

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
