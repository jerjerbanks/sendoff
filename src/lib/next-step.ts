/**
 * What the person looking at the trip should do next, and where they are in the
 * member journey. Pure: the dashboard's next-step card and step strip read this.
 */

export type StepKey = "party" | "budget" | "vote" | "commit" | "room";
export type StepState = "done" | "current" | "todo" | "skipped";

export interface JourneyStep {
  key: StepKey;
  label: string;
  state: StepState;
}

export interface NextStep {
  /** Short eyebrow, e.g. "Your next step" or "Organizer". */
  eyebrow: string;
  title: string;
  body: string;
  cta: string | null;
  /** Path relative to the trip, e.g. "/vote". "" is the dashboard. */
  href: string | null;
  tone: "action" | "calm" | "warn" | "bad";
}

export interface NextStepInput {
  viewer: {
    isPayer: boolean;
    role: "organizer" | "member" | "honoree";
    status: "invited" | "joined" | "committed" | "off_trip" | "declined";
    forfeitedCents: number;
  } | null;
  payerFirstName: string | null;
  partySize: number;
  tripStatus: string;
  hasBudget: boolean;
  /** Labels of open polls ("Where", "When", ...) this viewer hasn't voted in. */
  unvotedPolls: string[];
  hasRoom: boolean;
  buyInLabel: string;
  deadlineLabel: string | null;
  nextPayment: { name: string; amountLabel: string; dueLabel: string } | null;
  isOrganizer: boolean;
  pendingApprovals: number;
  payerCount: number;
  minPayers: number;
  /**
   * First-run setup facts, while the trip is still planning. Optional so older callers
   * keep their behavior. Never carries budgets or amounts.
   */
  setup?: {
    /** Poll labels ("Where", "When", ...) that have no visible options yet. */
    emptyPolls: string[];
    /** Polls with at least one visible option. */
    votablePolls: number;
    /** Active parties other than the organizer's. */
    otherParties: number;
    /** Anything on the cost sheet. */
    hasCosts: boolean;
    /** Lodging splits by bed and there are no beds yet, so every share reads $0. */
    needsBeds?: boolean;
  };
}

const planning = (status: string) => status === "planning" || status === "voting";

/** True once there was something to vote on and the viewer voted in all of it. */
function votingDone(input: NextStepInput): boolean {
  if (input.unvotedPolls.length > 0) return false;
  return input.setup ? input.setup.votablePolls > 0 : true;
}

/**
 * The organizer's first-run checklist: options to vote on, then the invite. These come before
 * the organizer's own budget and votes, because nobody else can do anything until they're done.
 */
function organizerSetupFirst(input: NextStepInput): NextStep | null {
  const setup = input.setup;
  if (!input.isOrganizer || !setup || !planning(input.tripStatus)) return null;
  const missing = setup.emptyPolls.filter((label) => label === "Where" || label === "When");
  if (missing.length > 0) {
    const both = missing.length > 1;
    return {
      eyebrow: "Set up your trip",
      title: both ? "Add places and dates to vote on" : missing[0] === "Where" ? "Add places to vote on" : "Add dates to vote on",
      body: "Two or three of each is plenty. Your group taps every one they'd do, and you lock in the winner.",
      cta: missing[0] === "Where" ? "Add places" : "Add dates",
      href: missing[0] === "Where" ? "/vote?q=destination" : "/vote?q=dates",
      tone: "action",
    };
  }
  if (setup.otherParties === 0) {
    return {
      eyebrow: "Set up your trip",
      title: "Invite your group",
      body: "Send one link to the group chat. People join, add who they're bringing, and vote. No app to install.",
      cta: "Get the invite link",
      href: "#invite",
      tone: "action",
    };
  }
  return null;
}

/** After the organizer's own steps: costs, then the buy-in. */
function organizerSetupLater(input: NextStepInput): NextStep | null {
  const setup = input.setup;
  if (!input.isOrganizer || !setup || !planning(input.tripStatus)) return null;
  if (!setup.hasCosts) {
    return {
      eyebrow: "Organizer",
      title: "Add the house and shared costs",
      body: "Put in the lodging total (an estimate is fine) so everyone sees their own number before they commit.",
      cta: "Add costs",
      href: "/costs",
      tone: "action",
    };
  }
  if (setup.needsBeds) {
    return {
      eyebrow: "Organizer",
      title: "Add the rooms and beds",
      body: "Lodging splits by the bed each party picks, so shares read $0 until there are beds. Paste the Airbnb link or add them by hand.",
      cta: "Add beds",
      href: "/sleep",
      tone: "action",
    };
  }
  return {
    eyebrow: "Organizer",
    title: "Open the buy-in when the plan is set",
    body: "Lock in the place and dates on the vote page, then set the buy-in amount and deadline.",
    cta: "Set up the buy-in",
    href: "/pay",
    tone: "action",
  };
}

const buyInWindow = (status: string) => status === "buy_in_open" || status === "booking_ready";

export function journey(input: NextStepInput): JourneyStep[] {
  const viewer = input.viewer;
  if (!viewer || !viewer.isPayer || viewer.role === "honoree") return [];
  const committed = viewer.status === "committed";
  const steps: { key: StepKey; label: string; done: boolean; skipped?: boolean }[] = [
    { key: "party", label: "Party", done: true },
    { key: "budget", label: "Budget", done: input.hasBudget, skipped: !input.hasBudget && (committed || votingDone(input)) },
    { key: "vote", label: "Vote", done: votingDone(input) },
    { key: "commit", label: "Commit", done: committed },
    { key: "room", label: "Room", done: input.hasRoom },
  ];
  let currentSet = false;
  return steps.map((step) => {
    if (step.done) return { key: step.key, label: step.label, state: "done" as const };
    if (step.skipped) return { key: step.key, label: step.label, state: "skipped" as const };
    if (!currentSet) {
      currentSet = true;
      return { key: step.key, label: step.label, state: "current" as const };
    }
    return { key: step.key, label: step.label, state: "todo" as const };
  });
}

export function nextStep(input: NextStepInput): NextStep {
  const viewer = input.viewer;
  const you = input.partySize > 1 ? "your party" : "you";
  if (!viewer) {
    return { eyebrow: "Welcome", title: "Who are you?", body: "Pick your name so we can show your share.", cta: "Pick your name", href: "?who=1", tone: "action" };
  }
  if (input.tripStatus === "cancelled") {
    return { eyebrow: "Trip", title: "This trip was cancelled", body: "Test buy-ins are marked refunded. No card was ever charged.", cta: null, href: null, tone: "bad" };
  }
  if (viewer.status === "off_trip" || viewer.status === "declined") {
    return {
      eyebrow: "You're off this trip",
      title: viewer.forfeitedCents > 0 ? "Your buy-in stayed with the trip" : "The deadline passed",
      body: viewer.forfeitedCents > 0 ? "You dropped after the stay was booked, so the buy-in paid down everyone else's lodging." : "You can't rejoin this trip.",
      cta: null,
      href: null,
      tone: "bad",
    };
  }
  const vote = (body: string): NextStep => ({
    eyebrow: "Your next step",
    title: `Vote on ${input.unvotedPolls[0]?.toLowerCase() ?? "the plan"}`,
    body,
    cta: "Vote",
    href: "/vote",
    tone: "action",
  });

  if (viewer.role === "honoree") {
    if (input.unvotedPolls.length > 0) return vote("You don't pay a share, but you do get a say.");
    return { eyebrow: "Guest of honor", title: "Sit back", body: "The group covers your share and your room is reserved.", cta: null, href: null, tone: "calm" };
  }

  if (!viewer.isPayer) {
    if (input.unvotedPolls.length > 0) return vote(`${input.payerFirstName ?? "Your payer"} handles the money. You still get a vote.`);
    return {
      eyebrow: "You're covered",
      title: `${input.payerFirstName ?? "Your payer"} handles your party`,
      body: "They commit, pay, and pick rooms for everyone on your party.",
      cta: "See your party",
      href: "/party",
      tone: "calm",
    };
  }

  const setupFirst = organizerSetupFirst(input);
  if (setupFirst) return setupFirst;

  const committed = viewer.status === "committed";
  if (!committed && input.unvotedPolls.length > 0) {
    if (!input.hasBudget) {
      return {
        eyebrow: "Your next step",
        title: "Set a private budget",
        body: "Only you see it. The polls then show whether each option fits the group — without naming anyone.",
        cta: "Set budget",
        href: "/budget",
        tone: "action",
      };
    }
    return vote("Tap everything you'd actually do.");
  }
  if (!committed && viewer.status === "joined" && buyInWindow(input.tripStatus)) {
    return {
      eyebrow: "Your next step",
      title: input.partySize > 1 ? `Commit your party: ${input.buyInLabel}` : `Commit: ${input.buyInLabel}`,
      body: `${input.deadlineLabel ? `Due ${input.deadlineLabel}. ` : ""}Refundable until the stay is booked.`,
      cta: "Commit",
      href: "/pay",
      tone: "action",
    };
  }
  if (committed && !input.hasRoom && input.tripStatus !== "cancelled") {
    return {
      eyebrow: "Your next step",
      title: "Pick where you sleep",
      body: `Parties pick in the order they committed. Claim a bed${input.partySize > 1 ? " or a whole room" : ""}.`,
      cta: "Pick a room",
      href: "/spots",
      tone: "action",
    };
  }
  if (input.isOrganizer) {
    if (input.tripStatus === "under_minimum") {
      return { eyebrow: "Organizer", title: "The group is short", body: `${input.payerCount} of ${input.minPayers} parties committed. Lower the minimum, extend, or cancel.`, cta: "Decide", href: "/organize", tone: "warn" };
    }
    if (input.tripStatus === "booking_ready") {
      return { eyebrow: "Organizer", title: "Book the stay", body: `${input.payerCount} parties are in. Record the booking and the real lodging total.`, cta: "Book the stay", href: "/book", tone: "action" };
    }
    if (input.pendingApprovals > 0) {
      return { eyebrow: "Organizer", title: `${input.pendingApprovals} room ${input.pendingApprovals === 1 ? "request" : "requests"}`, body: "Approve or deny bed shares and switches.", cta: "Review", href: "/approvals", tone: "action" };
    }
    const setupLater = organizerSetupLater(input);
    if (setupLater) return setupLater;
  }
  if (input.nextPayment) {
    return { eyebrow: "Your next step", title: `Pay ${input.nextPayment.name.toLowerCase()}: ${input.nextPayment.amountLabel}`, body: `Due ${input.nextPayment.dueLabel}. Test payment — no card charged.`, cta: "Pay", href: "/pay", tone: "action" };
  }
  if (input.tripStatus === "under_minimum") {
    return { eyebrow: "Waiting", title: "The group is short", body: "Not enough parties committed by the deadline. Your test buy-in is refunded unless the organizer lowers the minimum.", cta: null, href: null, tone: "warn" };
  }
  return {
    eyebrow: "All set",
    title: committed ? `${you === "you" ? "You're" : "Your party is"} in` : "Nothing to do yet",
    body: committed
      ? input.payerCount < input.minPayers
        ? `Waiting on ${input.minPayers - input.payerCount} more ${input.minPayers - input.payerCount === 1 ? "party" : "parties"} to commit.`
        : "We'll show the next payment here when it's due."
      : input.setup && input.setup.votablePolls === 0
        ? "The organizer is still adding places and dates to vote on. Check back soon."
        : "The organizer opens buy-in once the plan is set.",
    cta: null,
    href: null,
    tone: "calm",
  };
}
