"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { SPRINGS, prefersReducedMotion, springStep } from "@/lib/spring";

/**
 * Spring-driven number (snappy, k520 c36). Tabular figures and a width reserved
 * for the widest value, so the layout never moves while it counts.
 */
export function Ticker({
  value,
  from,
  format = (n) => Math.round(n).toLocaleString("en-US"),
  delayMs = 0,
  className = "",
}: {
  value: number;
  /** Start here and count to `value` once mounted. Defaults to `value` (no count). */
  from?: number;
  format?: (n: number) => string;
  delayMs?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const state = useRef({ x: from ?? value, v: 0 });
  const widest = Math.max(format(value).length, format(from ?? value).length);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const s = state.current;
    if (prefersReducedMotion()) {
      s.x = value;
      el.textContent = format(value);
      return;
    }
    let raf = 0;
    let last = 0;
    const { k, c } = SPRINGS.snappy;
    const frame = (now: number) => {
      const dt = Math.min(0.032, last ? (now - last) / 1000 : 1 / 60);
      last = now;
      [s.x, s.v] = springStep(s.x, s.v, value, k, dt, c);
      el.textContent = format(s.x);
      if (Math.abs(s.x - value) > 0.01 || Math.abs(s.v) > 0.01) raf = requestAnimationFrame(frame);
      else el.textContent = format(value);
    };
    const timer = window.setTimeout(() => (raf = requestAnimationFrame(frame)), delayMs);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [value, delayMs, format]);

  return (
    <span ref={ref} className={`inline-block tabular-nums ${className}`} style={{ minWidth: `${widest}ch` }}>
      {format(from ?? value)}
    </span>
  );
}

export type CellState = "in" | "you" | "open" | "booked";

/**
 * Headcount meter: a big serif count, 28px cells, and a 2px ink threshold.
 * With `commit`, it plays the commit moment: the "you" cells settle into lake
 * (70ms stagger), the count ticks up, then 520ms later every cell turns pine
 * (40ms stagger) and the threshold label reads BOOKING.
 */
export function HeadcountMeter({
  cells,
  need,
  unit,
  sub,
  updated,
  commit = false,
  framed = false,
}: {
  cells: CellState[];
  need: number;
  unit: string;
  sub: string;
  updated?: string;
  commit?: boolean;
  framed?: boolean;
}) {
  const [phase, setPhase] = useState<0 | 1 | 2>(commit ? 0 : 2);
  useEffect(() => {
    if (!commit) return;
    if (prefersReducedMotion()) {
      setPhase(2);
      return;
    }
    const a = window.setTimeout(() => setPhase(1), 120);
    const b = window.setTimeout(() => setPhase(2), 120 + 520 + 70 * cells.length);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, [commit, cells.length]);

  const youCount = cells.filter((cell) => cell === "you").length;
  const countNow = cells.filter((cell) => cell === "in" || cell === "booked").length;
  // Booked by the organizer (pine cells passed in) vs. only past the line.
  const bookedNow = cells.includes("booked");
  const shown: CellState[] = cells.map((cell) => {
    if (!commit) return cell === "in" && countNow >= need ? "booked" : cell;
    if (phase === 0) return cell;
    if (cell === "you") return phase === 2 && countNow + youCount >= need ? "booked" : "in";
    if (phase === 2 && cell === "in" && countNow + youCount >= need) return "booked";
    return cell;
  });
  const count = commit && phase > 0 ? countNow + youCount : countNow;
  const booking = shown.some((cell) => cell === "booked");
  const met = count >= need;
  // Static meter past the line but not booked yet: "ready", not "booking".
  const ready = booking && !bookedNow && !commit;
  const anyYou = shown.includes("you");
  const anyOpen = shown.includes("open");
  const anyIn = shown.includes("in");
  let youIndex = -1;

  return (
    <div className={framed ? "ft-panel p-4" : ""}>
      <div className="flex items-end gap-4">
        <p
          className={`ft-h1 flex shrink-0 items-baseline leading-none ${met ? "text-pine" : ""}`}
          aria-label={met ? `${count} ${unit} committed, enough to book` : `${count} of ${need} ${unit} committed`}
        >
          <span className="text-[64px]">
            {commit ? <Ticker value={count} from={countNow} delayMs={120 + 70 * youCount} /> : count}
          </span>
          {met ? null : <span className="ml-0.5 text-[30px] text-ink-2">/{need}</span>}
        </p>
        <div className="min-w-0 pb-1.5">
          <p className={`ft-lbl ${met ? "pine" : "ink"}`}>{met ? (bookedNow ? "Booked" : "Enough to book") : "Committed"}</p>
          <p className="ft-meta">{sub}</p>
        </div>
      </div>
      <div
        className="mt-9"
        role="img"
        aria-label={met ? `${count} ${unit} in, past the minimum of ${need}.` : `${count} of ${need} ${unit} in. The stay books at ${need}.`}
      >
        <div className="relative flex items-end gap-1.5">
          {shown.map((cell, index) => {
            if (cell === "you" || cells[index] === "you") youIndex += 1;
            const delay = cells[index] === "you" ? (phase === 1 ? youIndex * 70 : 0) : phase === 2 ? index * 40 : 0;
            return (
              <FragmentWithThreshold key={index} threshold={index === need} booking={booking} ready={ready} need={need}>
                <span className={`ft-cell ${cell === "open" ? "" : cell}`} style={{ ["--d" as string]: `${delay}ms` }} />
              </FragmentWithThreshold>
            );
          })}
          {cells.length === need ? <Threshold booking={booking} ready={ready} need={need} /> : null}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px] text-ink-2">
        {anyIn ? (
          <span className="flex items-center gap-1.5">
            <i className="ft-key bg-lake" aria-hidden /> In
          </span>
        ) : null}
        {anyYou ? (
          <span className="flex items-center gap-1.5">
            <i className="ft-key bg-clay" aria-hidden /> You · pending
          </span>
        ) : null}
        {booking ? (
          <span className="flex items-center gap-1.5">
            <i className="ft-key bg-pine" aria-hidden /> {ready ? "In · enough to book" : "Booking"}
          </span>
        ) : null}
        {anyOpen ? (
          <span className="flex items-center gap-1.5">
            <i className="ft-key bg-card shadow-[inset_0_0_0_1px_var(--border-ctl)]" aria-hidden /> Open
          </span>
        ) : null}
        {updated ? (
          <span className="ft-live ml-auto">
            <span className="ft-dot" aria-hidden />
            {updated}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function Threshold({ booking, ready = false, need }: { booking: boolean; ready?: boolean; need: number }) {
  return (
    <span className="relative flex flex-none self-stretch" aria-hidden>
      <span className="ft-threshold" />
      <span className="absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 whitespace-nowrap bg-paper px-1 font-mono text-[14px] font-medium tracking-[0.06em] text-ink">
        {ready ? "READY" : booking ? "BOOKING" : `BOOK @ ${need}`}
      </span>
    </span>
  );
}

function FragmentWithThreshold({
  threshold,
  booking,
  ready,
  need,
  children,
}: {
  threshold: boolean;
  booking: boolean;
  ready: boolean;
  need: number;
  children: ReactNode;
}) {
  return (
    <>
      {threshold ? <Threshold booking={booking} ready={ready} need={need} /> : null}
      {children}
    </>
  );
}

/**
 * Primary submit with a mono amount and an arrow. While the action runs it turns
 * pine with a drawn check and one ripple; reduced motion skips the ripple.
 */
export function CommitButton({ label, doneLabel, amount }: { label: string; doneLabel: string; amount?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={`ft-btn overflow-hidden ${pending ? "done" : ""}`} disabled={pending} aria-live="polite">
      {pending ? <span className="ft-ripple" aria-hidden /> : null}
      <span className="relative">{pending ? doneLabel : label}</span>
      <span className="relative flex items-center gap-2">
        {amount && !pending ? <span className="amt">{amount}</span> : null}
        {pending ? (
          <svg className="ft-drawn" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path d="M4 10.5 8.2 14.5 16 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <Arrow />
        )}
      </span>
    </button>
  );
}

export function Arrow() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Glass toast that drops in on the snappy spring and leaves on its own. */
export function Toast({ title, body, delayMs = 0, ms = 4200 }: { title: string; body?: string; delayMs?: number; ms?: number }) {
  const [shown, setShown] = useState(delayMs === 0);
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const a = window.setTimeout(() => setShown(true), prefersReducedMotion() ? 0 : delayMs);
    const b = window.setTimeout(() => setGone(true), delayMs + ms);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, [delayMs, ms]);
  if (!shown || gone) return null;
  return (
    <div className="ft-toast ft-glass" role="status">
      <span className="grid size-8 flex-none place-items-center rounded-lg bg-pine text-card" aria-hidden>
        <svg className="ft-drawn" width="18" height="18" viewBox="0 0 20 20" fill="none">
          <path d="M4 10.5 8.2 14.5 16 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="min-w-0">
        <span className="block font-semibold">{title}</span>
        {body ? <span className="ft-meta block">{body}</span> : null}
      </span>
    </div>
  );
}
