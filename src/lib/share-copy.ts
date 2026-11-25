import { formatDay, money } from "./format";
export type ShareMoment = "invite" | "vote" | "commit" | "resplit";

export interface ShareTrip {
  id: string;
  name: string;
  inviteToken: string;
  organizerName: string;
  guestName: string;
  buyInDeadline: string | null;
  currentShareCents: number | null;
}

export function shareMoment(pathname: string): ShareMoment {
  if (pathname.includes("/vote")) return "vote";
  if (pathname.includes("/pay")) return "commit";
  if (pathname.includes("resplit")) return "resplit";
  return "invite";
}

export function shareDraft(view: ShareTrip, moment: ShareMoment, origin: string): { title: string; text: string; url: string } {
  const invite = `${origin}/join/${view.inviteToken}?who=1`;
  const vote = `${origin}/trip/${view.id}/vote?who=1`;
  const pay = `${origin}/trip/${view.id}/pay?who=1`;
  const home = `${origin}/trip/${view.id}?who=1&resplit=1`;
  const when = view.buyInDeadline ? formatDay(view.buyInDeadline) : "the deadline";
  const amount = view.currentShareCents != null ? money(view.currentShareCents) : "your share";
  if (moment === "vote") {
    return {
      title: `${view.name}: vote`,
      text: `Vote on ${view.name} before we lock the weekend. One tap, then pick your name.`,
      url: vote,
    };
  }
  if (moment === "commit") {
    return {
      title: `${view.name}: commit`,
      text: `Commit by ${when}. Buy-in is refundable until the stay is booked. About ${amount}. Tap the link and pick your name.`,
      url: pay,
    };
  }
  if (moment === "resplit") {
    return {
      title: `${view.name}: new share`,
      text: `Who's going changed, so the share moved. Yours is about ${amount}. Open the link and pick your name.`,
      url: home,
    };
  }
  return {
    title: view.name,
    text: `${view.organizerName} started ${view.name} for ${view.guestName}. Join with this link, then pick your name.`,
    url: invite,
  };
}

export function smsHref(text: string, url: string): string {
  return `sms:?&body=${encodeURIComponent(`${text} ${url}`)}`;
}
