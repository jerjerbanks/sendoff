"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Floating glass tab bar. The active tab is a white thumb that glides between
 * tabs on the smooth spring (k260 c32). Reduced motion: it jumps.
 */
export function TripNav({ tripId, payLabel = "Commit" }: { tripId: string; payLabel?: string }) {
  const pathname = usePathname();
  const items = [
    { href: "", label: "Plan" },
    { href: "/vote", label: "Vote" },
    { href: "/costs", label: "Costs" },
    { href: "/pay", label: payLabel },
  ];
  const base = `/trip/${tripId}`;
  const active = items.findIndex((item) => (item.href === "" ? pathname === base : pathname.startsWith(`${base}${item.href}`)));
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
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
