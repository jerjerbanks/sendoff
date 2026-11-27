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
  Beds: (
    <>
      <path d="M3.5 19v-9M20.5 19v-5.5a2.5 2.5 0 0 0-2.5-2.5h-8V16" />
      <path d="M3.5 16h17" />
      <circle cx="7" cy="12.5" r="1.6" />
    </>
  ),
};

export function TripNav({ tripId, payLabel = "Commit" }: { tripId: string; payLabel?: string }) {
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
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable="false">
              {ICONS[item.label]}
            </svg>
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
