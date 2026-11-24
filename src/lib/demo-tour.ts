import { DEMO_INVITE_TOKEN, DEMO_TRIP_ID, LAKE_TRIP_ID } from "./constants";

/** The only trips that show demo tools. A real trip never does. */
export function isDemoTrip(tripId: string | null | undefined): boolean {
  return tripId === DEMO_TRIP_ID || tripId === LAKE_TRIP_ID;
}

export const DEMO_STEP_COOKIE = "sendoff_demo_step";

export interface TourStep {
  n: number;
  /** Who you are for this step. */
  userId: string;
  name: string;
  /** Where the step starts. */
  path: string;
  /** One line: what to do here. */
  goal: string;
  /** What the step shows, for the banner's second line. */
  why: string;
}

export const TOUR: TourStep[] = [
  {
    n: 1,
    userId: "user_chris",
    name: "Chris",
    path: `/trip/${DEMO_TRIP_ID}`,
    goal: "You're organizing Alex's bachelor party. Send the invite to the group.",
    why: "Usually Chris would put the house on his card and chase everyone. Here, everyone commits for themselves.",
  },
  {
    n: 2,
    userId: "user_taylor",
    name: "Taylor",
    path: `/join/${DEMO_INVITE_TOKEN}?tour=2`,
    goal: "The invite just landed in the group chat. Tap Join the trip.",
    why: "No app, no password. One link, and you see what you'd owe.",
  },
  {
    n: 3,
    userId: "user_drew",
    name: "Drew",
    path: `/trip/${DEMO_TRIP_ID}/vote`,
    goal: "Vote on where to go. Look at Cabo.",
    why: "Only Drew sees he's $81 over budget for Cabo. The group just sees “Fits most.”",
  },
  {
    n: 4,
    userId: "user_taylor",
    name: "Taylor",
    path: `/trip/${DEMO_TRIP_ID}/pay`,
    goal: "Commit with the $150 test buy-in, then grab a room.",
    why: "The buy-in is refundable until the stay is booked. Earlier commits pick rooms first.",
  },
  {
    n: 5,
    userId: "user_chris",
    name: "Chris",
    path: `/trip/${DEMO_TRIP_ID}`,
    goal: "The commit deadline arrives. Tap Run the deadline.",
    why: "Anyone who hasn't bought in is dropped, and the costs re-split among the five parties who did.",
  },
  {
    n: 6,
    userId: "user_chris",
    name: "Chris",
    path: `/trip/${DEMO_TRIP_ID}/book`,
    goal: "Five parties are in. Book the stay.",
    why: "Once it's booked, buy-ins lock: a late drop forfeits theirs instead of sticking Chris with the bill.",
  },
  {
    n: 7,
    userId: "user_maya",
    name: "Maya",
    path: `/trip/${LAKE_TRIP_ID}`,
    goal: "Now a family trip: four households, kids, and grandparents.",
    why: "Each household pays as one party, kids pay less of the food, and rooms are priced by the bed.",
  },
];

export function tourStep(n: number): TourStep | null {
  return TOUR.find((step) => step.n === n) ?? null;
}
