"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/wordmark";

const titles: Record<string, string> = {
  vote: "Vote",
  costs: "Costs",
  pay: "Commit",
  spots: "Beds",
  sleep: "Sleeping spots",
  party: "Your party",
  budget: "Your budget",
  book: "Book the stay",
  organize: "Organizer",
  approvals: "Approvals",
  settings: "Settings",
  metrics: "Metrics",
};

/**
 * 52px top bar with a 1px line. Home shows the wordmark; every other screen gets a
 * back arrow and its title. The right side is a live dot with mono status text.
 */
export function TopBar({
  tripId,
  tripName,
  payLabel,
  status,
  tone,
}: {
  tripId: string;
  tripName: string;
  payLabel: string;
  status: string;
  tone: "pine" | "clay" | "lake" | "error";
}) {
  const pathname = usePathname();
  const base = `/trip/${tripId}`;
  const segment = pathname.startsWith(base) ? pathname.slice(base.length).split("/")[1] ?? "" : "";
  const title = segment === "pay" ? payLabel : (titles[segment] ?? tripName);
  return (
    <header className="ft-bar bg-paper">
      {segment ? (
        <Link href={base} className="ft-bar-title -ml-2 min-h-12 pl-2 pr-3" aria-label={`Back to ${tripName}`}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path d="M16 10H4m5-5-5 5 5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="truncate">{title}</span>
        </Link>
      ) : (
        <Link href={base} className="flex min-h-12 items-center" aria-label={`${tripName}, home`}>
          <Wordmark />
        </Link>
      )}
      <span className="ft-live min-w-0">
        <span className={`ft-dot ${tone === "pine" ? "" : tone}`} aria-hidden />
        <span className="truncate">{status}</span>
      </span>
    </header>
  );
}
