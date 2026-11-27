import { DEMO_TRIP_ID, LAKE_TRIP_ID } from "./constants";

/** The only trips that show demo tools. A real trip never does. */
export function isDemoTrip(tripId: string | null | undefined): boolean {
  return tripId === DEMO_TRIP_ID || tripId === LAKE_TRIP_ID;
}

export const DEMO_STEP_COOKIE = "sendoff_demo_step";

/** What a step needs the golf trip to look like before it opens. */
export type TourStage = "seed" | "as_is" | "chris_paid" | "deadline_run";

export interface TourStep {
  n: number;
  /** Which walkthrough this step belongs to. */
  tour: "golf" | "family";
  /** Who you are for this step. */
  userId: string;
  /** Full name, shown in the banner. */
  name: string;
  /** Where the step starts. */
  path: string;
  /** One line: what to do here. */
  goal: string;
  /** What the step shows, for the banner's second line. */
  why: string;
  stage: TourStage;
  /** Show "Run the deadline" beside Next while anyone still hasn't paid. */
  runDeadline?: boolean;
}

const GOLF = `/trip/${DEMO_TRIP_ID}`;
const LAKE = `/trip/${LAKE_TRIP_ID}`;

/** The golf walkthrough's first step and the family walkthrough's first step. */
export const GOLF_TOUR_START = 1;
export const FAMILY_TOUR_START = 10;

/**
 * Demo Narratives v1 (Nov 27, 2026). Golf first (~90 seconds), then the Harper Lake
 * House family refresh (~60 seconds). All prices are demo estimates, not quotes.
 */
export const TOUR: TourStep[] = [
  {
    n: 1,
    tour: "golf",
    userId: "user_marcus",
    name: "Marcus Hale",
    path: "/demo/opener",
    goal: "Eight guys, one house, and Marcus is about to put $3,600 on his card.",
    why: "“Just Venmo me” is how one guy ends up fronting the house while two others go quiet.",
    stage: "seed",
  },
  {
    n: 2,
    tour: "golf",
    userId: "user_marcus",
    name: "Marcus Hale",
    path: GOLF,
    goal: "Marcus started a trip and picked golf. The whole app shifted into the golf look.",
    why: "Scottsdale and March 11–14 are already locked, which is why the buy-in can open.",
    stage: "as_is",
  },
  {
    n: 3,
    tour: "golf",
    userId: "user_jamal",
    name: "Jamal Wright",
    path: `${GOLF}/vote?q=activity`,
    goal: "Four courses at four price tiers. Everyone sees the green fee before they tap.",
    why: "We-Ko-Pa at $250 won. The extras below show their per-person price too.",
    stage: "as_is",
  },
  {
    n: 4,
    tour: "golf",
    userId: "user_jamal",
    name: "Jamal Wright",
    path: `${GOLF}/spots`,
    goal: "Jamal takes a bunk and Chris takes the couch, so their share of the house drops.",
    why: "Weights follow the bed: king with a private bath 1.5, queen 1.2, bunk 0.8, couch 0.5. Tags show the share at the current fill.",
    stage: "as_is",
  },
  {
    n: 5,
    tour: "golf",
    userId: "user_chrisd",
    name: "Chris Delgado",
    path: `${GOLF}/pay`,
    goal: "Five of the six needed are in. Commit with the $200 test buy-in.",
    why: "Chris is the sixth, which hits the minimum. The buy-in is refundable until the house is booked.",
    stage: "as_is",
  },
  {
    n: 6,
    tour: "golf",
    userId: "user_evan",
    name: "Evan Brooks",
    path: `${GOLF}/costs`,
    goal: "Six are in. Same trip, three different totals: Evan $1,350, Jamal $925, Chris $705.",
    why: "Every line adds up to the house and the extras. Only Evan sees how his total sits against his own budget.",
    stage: "chris_paid",
  },
  {
    n: 7,
    tour: "golf",
    userId: "user_marcus",
    name: "Marcus Hale",
    path: GOLF,
    goal: "Six of eight are in. The buy-in deadline arrives: tap Run the deadline.",
    why: "Ben Walsh and Kyle Brennan never paid. They move off the trip, and nobody chases them.",
    stage: "chris_paid",
    runDeadline: true,
  },
  {
    n: 8,
    tour: "golf",
    userId: "user_marcus",
    name: "Marcus Hale",
    path: `${GOLF}/book`,
    goal: "Six guys are in and the house is ready to book.",
    why: "Marcus isn't texting anyone for money. Once it's booked, buy-ins lock.",
    stage: "deadline_run",
  },
  {
    n: 9,
    tour: "golf",
    userId: "user_marcus",
    name: "Marcus Hale",
    path: "/demo/closer",
    goal: "Not just golf. A family beach week and a ski weekend get their own look.",
    why: "Same app, same math. Next is a family trip.",
    stage: "as_is",
  },
  {
    n: 10,
    tour: "family",
    userId: "user_maya",
    name: "Maya Harper",
    path: LAKE,
    goal: "Four households, ten people, one lake house. Each family pays as one.",
    why: "Harpers, Chens, Riveras and Kim. All four are in, and the house is ready to book.",
    stage: "as_is",
  },
  {
    n: 11,
    tour: "family",
    userId: "user_maya",
    name: "Maya Harper",
    path: `${LAKE}/spots`,
    goal: "Kids are on the trip. They aren't on the same bill.",
    why: "Quinn shares a bed, Noor sleeps in a crib at $0, Riley counts as an adult, and George has the ground-floor suite.",
    stage: "as_is",
  },
  {
    n: 12,
    tour: "family",
    userId: "user_maya",
    name: "Maya Harper",
    path: `${LAKE}/costs`,
    goal: "Four bills: $1,922, $915, $1,036 and $639. They add up to the house.",
    why: "Rooms are priced by the bed, a child counts as half on groceries, an infant as zero, and boat tickets by age. Rounding up leaves $2 in the trip pot.",
    stage: "as_is",
  },
  {
    n: 13,
    tour: "family",
    userId: "user_maya",
    name: "Maya Harper",
    path: `${LAKE}/pay`,
    goal: "All four households are in. Maya isn't chasing anyone.",
    why: "Each paid the $100 buy-in. Lodging share is due May 15 and the balance June 15, 11:59 PM CT.",
    stage: "as_is",
  },
];

export function tourStep(n: number): TourStep | null {
  return TOUR.find((step) => step.n === n) ?? null;
}
