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
}

const buyInWindow = (status: string) => status === "buy_in_open" || status === "booking_ready";

export function journey(input: NextStepInput): JourneyStep[] {
  const viewer = input.viewer;
  if (!viewer || !viewer.isPayer || viewer.role === "honoree") return [];
  const committed = viewer.status === "committed";
  const steps: { key: StepKey; label: string; done: boolean; skipped?: boolean }[] = [
    { key: "party", label: "Party", done: true },
    { key: "budget", label: "Budget", done: input.hasBudget, skipped: !input.hasBudget && (committed || input.unvotedPolls.length === 0) },
    { key: "vote", label: "Vote", done: input.unvotedPolls.length === 0 },
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
      : "The organizer opens buy-in once the plan is set.",
    cta: null,
    href: null,
    tone: "calm",
  };
}
