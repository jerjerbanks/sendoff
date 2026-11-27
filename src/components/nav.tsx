"use client";

import type React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Floating glass tab bar. The active tab is a white thumb that glides between
 * tabs on the smooth spring (k260 c32). Reduced motion: it jumps.
 */
/** 22px line icons, 1.6 stroke, round caps: same hand as the ridge. Decorative; the label names the tab. */
const ICONS: Record<string, React.ReactNode> = {
  Plan: <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" />,
  Vote: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="m8.5 12.2 2.4 2.4 4.8-5" />
    </>
  ),
  Costs: (
    <>
      <path d="M5 20V10M10 20V5M15 20v-7M20 20V8" />
    </>
  ),
  Commit: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="m8.5 12.2 2.4 2.4 4.8-5" />
    </>
  ),
  Pay: (
    <>
      <rect x="3.5" y="6" width="17" height="12" rx="3" />
      <path d="M3.5 10.5h17" />
    </>
  ),
  Organizer: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M6 18l1.6-1.6M16.4 7.6 18 6" />
    </>
  ),
  Beds: (
    <>
      <path d="M3.5 19v-9M20.5 19v-5.5a2.5 2.5 0 0 0-2.5-2.5h-8V16" />
      <path d="M3.5 16h17" />
      <circle cx="7" cy="12.5" r="1.6" />
    </>
  ),
};

function useTripTabs(tripId: string, payLabel: string) {
  const pathname = usePathname();
  const items = [
    { href: "", label: "Plan" },
    { href: "/vote", label: "Vote" },
    { href: "/costs", label: "Costs" },
    { href: "/pay", label: payLabel },
    // Beds: the only way to the floor plan from every screen, phones included.
    { href: "/spots", label: "Beds", also: "/sleep" },
  ];
  const base = `/trip/${tripId}`;
  const active = items.findIndex((item) =>
    item.href === ""
      ? pathname === base
      : pathname.startsWith(`${base}${item.href}`) || ("also" in item && pathname.startsWith(`${base}${item.also}`)),
  );
  return { items, active, base, pathname };
}

function TabIcon({ label }: { label: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable="false">
      {ICONS[label]}
    </svg>
  );
}

export function TripNav({ tripId, payLabel = "Commit" }: { tripId: string; payLabel?: string }) {
  const { items, active, base } = useTripTabs(tripId, payLabel);
  return (
    <nav aria-label="Trip" className="ft-tabs ft-glass">
      <div className="ft-tabs-track" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
        {active >= 0 ? (
          <span
            className="ft-tabs-thumb"
            aria-hidden
            style={{ width: `${100 / items.length}%`, transform: `translateX(${active * 100}%)` }}
          />
        ) : null}
        {items.map((item, index) => (
          <Link key={item.label} href={`${base}${item.href}`} aria-current={index === active ? "page" : undefined} className="ft-tab">
            <TabIcon label={item.label} />
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

/**
 * Desktop sidebar (1024px and up, v6.1 trip-home desktop pattern): the wordmark, the same
 * trip sections as the tab bar, then a small card for the trip. Below 1024px it is hidden
 * and the floating tab bar does the job.
 */
export function TripSidebar({
  tripId,
  tripName,
  payLabel = "Commit",
  isOrganizer = false,
  meta,
  wordmark,
  thumb,
}: {
  tripId: string;
  tripName: string;
  payLabel?: string;
  isOrganizer?: boolean;
  meta: string;
  wordmark: React.ReactNode;
  thumb: string;
}) {
  const { items, active, base, pathname } = useTripTabs(tripId, payLabel);
  const organizerOn = pathname.startsWith(`${base}/organize`);
  return (
    <aside className="ft-side" aria-label="Trip sidebar">
      <Link href={base} className="ft-side-brand" aria-label="Trip home">
        {wordmark}
      </Link>
      <nav aria-label="Trip sections" className="ft-side-nav">
        {items.map((item, index) => (
          <Link key={item.label} href={`${base}${item.href}`} aria-current={index === active ? "page" : undefined}>
            <TabIcon label={item.label} />
            <span>{item.label}</span>
          </Link>
        ))}
        {isOrganizer ? (
          <Link href={`${base}/organize`} aria-current={organizerOn ? "page" : undefined}>
            <TabIcon label="Organizer" />
            <span>Organizer tools</span>
          </Link>
        ) : null}
      </nav>
      <Link href={base} className="ft-side-trip">
        <span className="ft-side-thumb" style={{ backgroundImage: `url(${thumb})` }} aria-hidden />
        <span className="block px-4 pt-3 pb-3.5">
          <span className="block truncate text-[15px] font-semibold">{tripName}</span>
          <span className="ft-meta block truncate">{meta}</span>
        </span>
      </Link>
    </aside>
  );
}
