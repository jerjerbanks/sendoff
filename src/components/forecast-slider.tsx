"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { prefersReducedMotion, springStep } from "@/lib/spring";

export interface ForecastRow {
  payers: number;
  totalCents: number;
  /** Only possible if an inter-party bed share is approved. */
  expanded: boolean;
}

const dollars = (cents: number) => `$${Math.round(cents / 100).toLocaleString("en-US")}`;

/**
 * "What if more people commit?" Drag across party counts; the share springs to
 * each value. Snaps to whole parties on release. Arrow keys work too.
 */
export function ForecastSlider({
  rows,
  startPayers,
  nowPayers,
  bandLowDeltaCents,
  bandHighDeltaCents,
}: {
  rows: ForecastRow[];
  startPayers: number;
  /** Parties committed now, counting the viewer only if they committed. */
  nowPayers: number;
  bandLowDeltaCents: number | null;
  bandHighDeltaCents: number | null;
}) {
  const startIndex = Math.max(0, rows.findIndex((row) => row.payers === startPayers));
  const [index, setIndex] = useState(startIndex);
  const [dragging, setDraggingState] = useState(false);
  // The animation loop reads this live; React state would be stale inside it.
  const draggingRef = useRef(false);
  const setDragging = (value: boolean) => {
    draggingRef.current = value;
    setDraggingState(value);
  };
  const track = useRef<HTMLDivElement>(null);
  const thumb = useRef<HTMLDivElement>(null);
  const amount = useRef<HTMLSpanElement>(null);
  const band = useRef<HTMLSpanElement>(null);
  // Continuous position (in stops) and the displayed cents, both sprung.
  const pos = useRef({ x: startIndex, v: 0, target: startIndex });
  const shown = useRef({ x: rows[startIndex]?.totalCents ?? 0, v: 0 });
  const raf = useRef(0);
  const last = useRef(0);

  const lastIndex = rows.length - 1;
  const valueAt = useCallback(
    (x: number) => {
      const lo = Math.max(0, Math.min(lastIndex, Math.floor(x)));
      const hi = Math.min(lastIndex, lo + 1);
      const t = Math.max(0, Math.min(1, x - lo));
      return (rows[lo]?.totalCents ?? 0) * (1 - t) + (rows[hi]?.totalCents ?? 0) * t;
    },
    [rows, lastIndex],
  );

  const paint = useCallback(() => {
    const p = lastIndex > 0 ? pos.current.x / lastIndex : 0;
    if (thumb.current) thumb.current.style.left = `${p * 100}%`;
    if (amount.current) amount.current.textContent = dollars(shown.current.x);
    if (band.current && bandLowDeltaCents != null && bandHighDeltaCents != null) {
      band.current.textContent = `${dollars(shown.current.x + bandLowDeltaCents)}–${dollars(shown.current.x + bandHighDeltaCents)} with your flight`;
    }
  }, [lastIndex, bandLowDeltaCents, bandHighDeltaCents]);

  const run = useCallback(() => {
    cancelAnimationFrame(raf.current);
    last.current = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.032, (now - last.current) / 1000);
      last.current = now;
      const p = pos.current;
      if (!draggingRef.current) [p.x, p.v] = springStep(p.x, p.v, p.target, 220, dt);
      const s = shown.current;
      [s.x, s.v] = springStep(s.x, s.v, valueAt(p.x), 160, dt);
      paint();
      const settled = Math.abs(p.x - p.target) < 0.001 && Math.abs(p.v) < 0.01 && Math.abs(s.x - valueAt(p.x)) < 50 && Math.abs(s.v) < 50;
      if (draggingRef.current || !settled) raf.current = requestAnimationFrame(frame);
      else {
        p.x = p.target;
        s.x = valueAt(p.target);
        paint();
      }
    };
    raf.current = requestAnimationFrame(frame);
  }, [paint, valueAt]);

  const goTo = useCallback(
    (i: number) => {
      const next = Math.max(0, Math.min(lastIndex, i));
      setIndex(next);
      pos.current.target = next;
      if (prefersReducedMotion()) {
        pos.current.x = next;
        shown.current.x = valueAt(next);
        paint();
      } else run();
    },
    [lastIndex, paint, run, valueAt],
  );

  useEffect(() => {
    paint();
    return () => cancelAnimationFrame(raf.current);
  }, [paint]);

  const fromPointer = (clientX: number) => {
    const rect = track.current?.getBoundingClientRect();
    if (!rect || lastIndex <= 0) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * lastIndex;
  };

  if (rows.length < 2) return null;
  const row = rows[index] ?? rows[0];
  const now = rows[rows.findIndex((item) => item.payers === nowPayers)];
  const max = Math.max(...rows.map((item) => item.totalCents));
  const min = Math.min(...rows.map((item) => item.totalCents));
  const diff = now && row ? row.totalCents - now.totalCents : null;

  return (
    <div className="mt-4 select-none">
      <div className="flex items-baseline justify-between gap-3">
        <span ref={amount} className="font-serif text-4xl tabular-nums leading-none">
          {dollars(row?.totalCents ?? 0)}
        </span>
        <span className="text-right text-sm text-muted">
          if <span className="font-semibold text-ink tabular-nums">{row?.payers}</span> parties commit
        </span>
      </div>
      {bandLowDeltaCents != null && bandHighDeltaCents != null ? (
        <span ref={band} className="mt-1 block text-sm text-accent tabular-nums" />
      ) : null}

      <div className="mt-4 flex h-14 items-end gap-1.5" aria-hidden>
        {rows.map((item, i) => {
          const h = max === min ? 60 : 30 + ((item.totalCents - min) / (max - min)) * 70;
          return (
            <button
              key={item.payers}
              type="button"
              tabIndex={-1}
              onClick={() => goTo(i)}
              className={`flex-1 rounded-t-lg transition-colors duration-200 ${i === index ? "bg-accent" : item.expanded ? "bg-chip/60 outline-1 outline-dashed outline-line" : "bg-chip"}`}
              style={{ height: `${h}%` }}
            />
          );
        })}
      </div>

      <div
        ref={track}
        className="relative mt-2 h-10 touch-none"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          setDragging(true);
          pos.current.x = fromPointer(event.clientX);
          pos.current.v = 0;
          run();
        }}
        onPointerMove={(event) => {
          if (!draggingRef.current) return;
          pos.current.x = fromPointer(event.clientX);
          const near = Math.round(pos.current.x);
          if (near !== index) setIndex(near);
        }}
        onPointerUp={() => {
          setDragging(false);
          goTo(Math.round(pos.current.x));
        }}
        onPointerCancel={() => {
          setDragging(false);
          goTo(Math.round(pos.current.x));
        }}
      >
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-chip" />
        {rows.map((item, i) => (
          <span
            key={item.payers}
            className={`absolute top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${item.payers === nowPayers ? "bg-good" : "bg-line"}`}
            style={{ left: `${lastIndex > 0 ? (i / lastIndex) * 100 : 0}%` }}
          />
        ))}
        <div
          ref={thumb}
          role="slider"
          tabIndex={0}
          aria-label="Parties committed"
          aria-valuemin={rows[0]?.payers}
          aria-valuemax={rows[lastIndex]?.payers}
          aria-valuenow={row?.payers}
          aria-valuetext={`${dollars(row?.totalCents ?? 0)} if ${row?.payers} parties commit`}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight" || event.key === "ArrowUp") {
              event.preventDefault();
              goTo(index + 1);
            } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
              event.preventDefault();
              goTo(index - 1);
            } else if (event.key === "Home") goTo(0);
            else if (event.key === "End") goTo(lastIndex);
          }}
          className={`absolute top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-paper bg-accent shadow-lg transition-transform duration-150 ${dragging ? "scale-110" : ""}`}
          style={{ left: `${lastIndex > 0 ? (startIndex / lastIndex) * 100 : 0}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted tabular-nums" aria-hidden>
        {rows.map((item) => (
          <span key={item.payers} className={item.payers === nowPayers ? "text-good" : ""}>
            {item.payers}
            {item.payers === nowPayers ? " · now" : ""}
          </span>
        ))}
      </div>

      <p className="mt-3 text-sm text-muted">
        {row?.expanded
          ? "Only if two parties agree to share a bed and the organizer approves."
          : diff != null && diff !== 0
            ? `${diff < 0 ? `${dollars(-diff)} less` : `${dollars(diff)} more`} than at ${now?.payers} parties.`
            : now && row?.payers === now.payers
              ? "Where things stand now."
              : "Drag to see how your share moves as people commit."}
      </p>
    </div>
  );
}
