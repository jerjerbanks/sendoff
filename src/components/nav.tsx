"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Map, Receipt, ThumbsUp, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "", label: "Plan", icon: Map },
  { href: "/vote", label: "Vote", icon: ThumbsUp },
  { href: "/costs", label: "Costs", icon: Receipt },
  { href: "/pay", label: "Pay", icon: Wallet },
];

export function TripNav({ tripId }: { tripId: string }) {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper/95 backdrop-blur md:static md:border-t-0 md:bg-transparent">
      <div className="mx-auto flex max-w-lg md:max-w-3xl">
        {items.map((item) => {
          const href = `/trip/${tripId}${item.href}`;
          const active = item.href === "" ? pathname === href : pathname.startsWith(href);
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={href}
              className={cn(
                "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-semibold md:min-h-11 md:flex-none md:flex-row md:rounded-full md:px-4",
                active ? "text-accent" : "text-muted",
              )}
            >
              <Icon className="size-5" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
