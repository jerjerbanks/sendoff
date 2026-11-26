"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { AppMenu, type MenuShare } from "@/components/app-menu";
import { ThemeToggle } from "@/components/theme-toggle";
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
 * back arrow and its title. The right side is a live dot with mono status text, then the
 * Light / Dark / Auto toggle and the Menu sheet.
 */
export function TopBar({
  tripId,
  tripName,
  payLabel,
  status,
  tone,
  isOrganizer = false,
  share = null,
}: {
  isOrganizer?: boolean;
  share?: MenuShare | null;
  tripId: string;
  tripName: string;
  payLabel: string;
  status: string;
  tone: "pine" | "action" | "lake" | "error";
}) {
  const pathname = usePathname();
  const base = `/trip/${tripId}`;
  const segment = pathname.startsWith(base) ? pathname.slice(base.length).split("/")[1] ?? "" : "";
  const title = segment === "pay" ? payLabel : (titles[segment] ?? tripName);
  const search = useSearchParams();
  const list = search?.get("view") === "list";
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
          <Wordmark className="whitespace-nowrap" />
        </Link>
      )}
      <div className="flex min-w-0 items-center gap-2">
        {segment === "spots" ? (
          <nav className="ft-seg ft-seg-sm" aria-label="Show beds as">
            <Link href={`${base}/spots`} aria-current={list ? undefined : "page"} replace scroll={false}>
              Plan
            </Link>
            <Link href={`${base}/spots?view=list`} aria-current={list ? "page" : undefined} replace scroll={false}>
              List
            </Link>
          </nav>
        ) : (
          // Below 480px the status yields its room to the theme toggle; the page itself says the same thing.
          <span className="ft-live min-w-0 max-[479px]:hidden">
            <span className={`ft-dot ${tone === "pine" ? "" : tone}`} aria-hidden />
            <span className="truncate">{status}</span>
          </span>
        )}
        {/* Below 480px the theme toggle lives in the menu, so the Beds Plan/List segment still fits. */}
        <ThemeToggle variant="bar" className="max-[479px]:hidden" />
        <AppMenu tripId={tripId} isOrganizer={isOrganizer} share={share} />
      </div>
    </header>
  );
}
