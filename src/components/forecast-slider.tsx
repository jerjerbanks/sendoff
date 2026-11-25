"use client";

import { useEffect, useRef, useState } from "react";
import { SPRINGS, prefersReducedMotion, springStep } from "@/lib/spring";

export interface ForecastRow {
  payers: number;
  totalCents: number;
  /** Only possible if an inter-party bed share is approved. */
  expanded: boolean;
}

const dollars = (cents: number) => `$${Math.round(cents / 100).toLocaleString("en-US")}`;

/**
 * "If the group changes": a money hero that springs (snappy) to the share at the
 * chosen count, a segmented control of party counts, and a dot-grid chart with
 * mono axes, an ink tooltip and, when the viewer saved one, a dashed BUDGET line.
 */
export function ForecastSlider({
  rows,
  startPayers,
  nowPayers,
  bandLowDeltaCents,
  bandHighDeltaCents,
  budgetCents = null,
  label,
  compact = false,
}: {
  rows: ForecastRow[];
  startPayers: number;
  /** Parties committed now, counting the viewer only if they committed. */
  nowPayers: number;
  bandLowDeltaCents: number | null;
  bandHighDeltaCents: number | null;
  /** The viewer's own private budget, if they saved one. Never anyone else's. */
  budgetCents?: number | null;
  label?: string;
  /** Leave out the money hero when the screen already has one. */
  compact?: boolean;
}) {
  const startIndex = Math.max(0, rows.findIndex((row) => row.payers === startPayers));
  const [index, setIndex] = useState(startIndex);
  const [dragging, setDraggingState] = useState(false);
  // The animation loop reads these live; React state would be stale inside it.
  const draggingRef = useRef(false);
  const setDragging = (value: boolean) => {
    draggingRef.current = value;
    setDraggingState(value);
  };
  const amount = useRef<HTMLSpanElement>(null);
  const band = useRef<HTMLSpanElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const dot = useRef<SVGCircleElement>(null);
  const guide = useRef<SVGLineElement>(null);
  const tip = useRef<HTMLSpanElement>(null);
  // Continuous position along the curve (in stops) and the displayed cents, both sprung:
  // the dot glides between counts and follows a finger while dragging, like the old slider.
  const pos = useRef({ x: startIndex, v: 0, target: startIndex });
  const shown = useRef({ x: rows[startIndex]?.totalCents ?? 0, v: 0 });
  const raf = useRef(0);
  const row = rows[index] ?? rows[0];
  const lastIndex = rows.length - 1;

  // Chart geometry, in SVG user units that map 1:1 to CSS px at 350 wide.
  const W = 350;
  const H = 180;
  const padX = 28;
  const top = 36;
  const bottom = 40;
  const shareMax = Math.max(...rows.map((item) => item.totalCents));
  const shareMin = Math.min(...rows.map((item) => item.totalCents));
  // Draw the budget line only when it sits near the curve; far above, it would flatten the data.
  const drawBudget = budgetCents != null && budgetCents <= shareMax + Math.max(shareMax - shareMin, shareMax * 0.08) * 1.5;
  const values = rows.map((item) => item.totalCents).concat(drawBudget && budgetCents != null ? [budgetCents] : []);
  const hi = Math.max(...values);
  const lo = Math.min(...values);
  const span = hi - lo || 1;
  const x = (i: number) => padX + (i * (W - padX * 2)) / Math.max(1, lastIndex);
  const y = (cents: number) => top + ((hi - cents) / span) * (H - top - bottom);

  /** Cents on the curve at a fractional stop. */
  const valueAt = (at: number) => {
    const a = Math.max(0, Math.min(lastIndex, Math.floor(at)));
    const b = Math.min(lastIndex, a + 1);
    const t = Math.max(0, Math.min(1, at - a));
    return (rows[a]?.totalCents ?? 0) * (1 - t) + (rows[b]?.totalCents ?? 0) * t;
  };

  const paint = () => {
    const at = pos.current.x;
    const cx = x(at);
    const cy = y(valueAt(at));
    dot.current?.setAttribute("cx", cx.toFixed(2));
    dot.current?.setAttribute("cy", cy.toFixed(2));
    if (guide.current) {
      guide.current.setAttribute("x1", cx.toFixed(2));
      guide.current.setAttribute("x2", cx.toFixed(2));
      guide.current.setAttribute("y1", cy.toFixed(2));
    }
    if (tip.current) {
      tip.current.style.left = `clamp(8px, calc(${(cx / W) * 100}% - 40px), calc(100% - 92px))`;
      tip.current.style.top = `max(6px, calc(${(cy / H) * 100}% - 40px))`;
      tip.current.textContent = dollars(shown.current.x);
    }
    if (amount.current) amount.current.textContent = dollars(shown.current.x);
    if (band.current && bandLowDeltaCents != null && bandHighDeltaCents != null) {
      band.current.textContent = `${dollars(shown.current.x + bandLowDeltaCents)}–${dollars(shown.current.x + bandHighDeltaCents)} with your flight`;
    }
  };
  // Latest paint for the loop, without restarting it on every render.
  const paintRef = useRef(paint);
  paintRef.current = paint;
  const valueRef = useRef(valueAt);
  valueRef.current = valueAt;

  const run = () => {
    cancelAnimationFrame(raf.current);
    let last = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.032, last ? (now - last) / 1000 : 1 / 60);
      last = now;
      const p = pos.current;
      const s = shown.current;
      if (!draggingRef.current) [p.x, p.v] = springStep(p.x, p.v, p.target, SPRINGS.smooth.k, dt, SPRINGS.smooth.c);
      [s.x, s.v] = springStep(s.x, s.v, valueRef.current(p.x), SPRINGS.snappy.k, dt, SPRINGS.snappy.c);
      paintRef.current();
      const settled = Math.abs(p.x - p.target) < 0.002 && Math.abs(p.v) < 0.01 && Math.abs(s.x - valueRef.current(p.x)) < 50 && Math.abs(s.v) < 50;
      if (draggingRef.current || !settled) raf.current = requestAnimationFrame(frame);
      else {
        p.x = p.target;
        p.v = 0;
        s.x = valueRef.current(p.target);
        paintRef.current();
      }
    };
    raf.current = requestAnimationFrame(frame);
  };

  const goTo = (i: number) => {
    const next = Math.max(0, Math.min(lastIndex, i));
    setIndex(next);
    pos.current.target = next;
    if (prefersReducedMotion()) {
      pos.current.x = next;
      shown.current.x = rows[next]?.totalCents ?? 0;
      paint();
    } else run();
  };

  useEffect(() => {
    paintRef.current();
    return () => cancelAnimationFrame(raf.current);
  }, []);

  /** Fractional stop under a pointer, from the plotted x range of the chart panel. */
  const fromPointer = (clientX: number) => {
    const rect = panel.current?.getBoundingClientRect();
    if (!rect || lastIndex <= 0) return 0;
    const px = ((clientX - rect.left) / rect.width) * W;
    return Math.max(0, Math.min(lastIndex, ((px - padX) / (W - padX * 2)) * lastIndex));
  };

  if (rows.length < 2 || !row) return null;
  const now = rows.find((item) => item.payers === nowPayers);
  const diff = now ? row.totalCents - now.totalCents : null;
  const widest = Math.max(...rows.map((item) => dollars(item.totalCents).length));

  const line = rows.map((item, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(item.totalCents).toFixed(1)}`).join(" ");
  const area = `${line} L${x(rows.length - 1)},${H - bottom} L${x(0)},${H - bottom} Z`;
  const overBudget = budgetCents != null ? row.totalCents - budgetCents : null;

  return (
    <div className="select-none">
      <div className={compact ? "sr-only" : "ft-glow -mx-5 px-5 py-2"} aria-live="polite">
        {label ? <p className="ft-lbl">{label}</p> : null}
        <p className="ft-money mt-1 text-[68px]">
          {/* The spring writes this one; React only renders its first value, so it never flashes the target. */}
          <span ref={amount} className="inline-block" style={{ minWidth: `${widest - 0.6}ch` }} aria-hidden>
            {dollars(rows[startIndex]?.totalCents ?? 0)}
          </span>
          <span className="sr-only">{dollars(row.totalCents)}</span>
        </p>
        {bandLowDeltaCents != null && bandHighDeltaCents != null ? (
          <span ref={band} className="ft-mono mt-1 block text-[15px] text-clay-ink" />
        ) : null}
        <p className="ft-meta mt-1">
          if <span className="ft-mono text-ink">{row.payers}</span> parties commit
          {diff != null && diff !== 0 ? ` · ${diff < 0 ? `${dollars(-diff)} less` : `${dollars(diff)} more`} than now` : row.payers === nowPayers ? " · where things stand" : ""}
        </p>
      </div>

      <div className={`ft-seg ${compact ? "" : "mt-5"}`} role="radiogroup" aria-label="Parties committed">
        {rows.map((item, i) => (
          <button
            key={item.payers}
            type="button"
            role="radio"
            aria-checked={i === index}
            aria-label={`${item.payers} parties, ${dollars(item.totalCents)}`}
            onClick={() => goTo(i)}
            tabIndex={i === index ? 0 : -1}
            onKeyDown={(event) => {
              const step = event.key === "ArrowRight" || event.key === "ArrowUp" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowDown" ? -1 : 0;
              const jump = event.key === "Home" ? 0 : event.key === "End" ? lastIndex : null;
              if (!step && jump == null) return;
              event.preventDefault();
              const next = jump ?? Math.max(0, Math.min(lastIndex, index + step));
              goTo(next);
              (event.currentTarget.parentElement?.children[next] as HTMLElement | undefined)?.focus();
            }}
            className={`ft-mono !text-[16px] ${i === index ? "on" : ""} ${item.payers === nowPayers && i !== index ? "!text-clay-ink" : ""}`}
          >
            {item.payers}
          </button>
        ))}
      </div>

      <div
        ref={panel}
        className={`ft-panel ft-dotgrid relative mt-3 cursor-grab overflow-hidden ${dragging ? "cursor-grabbing" : ""}`}
        style={{ touchAction: "pan-y" }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          setDragging(true);
          pos.current.x = fromPointer(event.clientX);
          pos.current.v = 0;
          const near = Math.round(pos.current.x);
          if (near !== index) setIndex(near);
          if (prefersReducedMotion()) {
            shown.current.x = valueAt(pos.current.x);
            paint();
          } else run();
        }}
        onPointerMove={(event) => {
          if (!draggingRef.current) return;
          pos.current.x = fromPointer(event.clientX);
          if (prefersReducedMotion()) {
            shown.current.x = valueAt(pos.current.x);
            paint();
          }
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
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={`Share by party count, from ${dollars(rows[0].totalCents)} to ${dollars(rows[rows.length - 1].totalCents)}`}>
          <path d={area} fill="var(--lake)" opacity="0.06" />
          {drawBudget && budgetCents != null ? (
            <g>
              <line x1={padX - 8} x2={W - padX + 8} y1={y(budgetCents)} y2={y(budgetCents)} stroke="var(--error)" strokeWidth="1" strokeDasharray="4 4" />
              <text x={W - padX + 8} y={y(budgetCents) - 6} textAnchor="end" fontFamily="var(--font-mono)" fontSize="14" fill="var(--error)">
                BUDGET
              </text>
            </g>
          ) : null}
          <path d={line} fill="none" stroke="var(--lake)" strokeWidth="1.5" strokeLinejoin="round" />
          <line ref={guide} x1={x(startIndex)} x2={x(startIndex)} y1={y(rows[startIndex]?.totalCents ?? 0)} y2={H - bottom} stroke="var(--clay)" strokeWidth="1" strokeDasharray="2 3" />
          {rows.map((item, i) => (
            <rect key={item.payers} x={x(i) - 3.5} y={y(item.totalCents) - 3.5} width="7" height="7" fill="var(--lake)" stroke="var(--bg-surface)" strokeWidth="1" />
          ))}
          <circle
            ref={dot}
            cx={x(startIndex)}
            cy={y(rows[startIndex]?.totalCents ?? 0)}
            r={dragging ? 8 : 6.5}
            fill="var(--clay)"
            stroke="var(--bg-surface)"
            strokeWidth="2"
            style={{ transition: "r var(--dur-micro) var(--spring-micro)" }}
          />
          {rows.map((item, i) => (
            <text
              key={item.payers}
              x={x(i)}
              y={H - 14}
              textAnchor="middle"
              fontFamily="var(--font-mono)"
              fontSize="14"
              fill={i === index ? "var(--ink-1)" : "var(--ink-3)"}
            >
              {item.payers}
            </text>
          ))}
        </svg>
        <span
          ref={tip}
          className="ft-mono pointer-events-none absolute rounded-md bg-ink px-2.5 py-1 text-[15px] font-medium text-card shadow-[var(--shadow-2)]"
          style={{
            left: `clamp(8px, calc(${(x(startIndex) / W) * 100}% - 40px), calc(100% - 92px))`,
            top: `max(6px, calc(${(y(rows[startIndex]?.totalCents ?? 0) / H) * 100}% - 40px))`,
          }}
          aria-hidden
        >
          {dollars(rows[startIndex]?.totalCents ?? 0)}
        </span>
      </div>
      <p className="ft-meta mt-2">Drag along the chart, or tap a count.</p>
      {budgetCents != null && !drawBudget ? <p className="ft-meta mt-3">Under your private budget at every count.</p> : null}
      {row.expanded ? <p className="ft-meta mt-3">Only if two parties agree to share a bed and the organizer approves.</p> : null}
      {overBudget != null && overBudget > 0 ? (
        <p className="mt-3 flex items-start gap-2.5 text-[15px] text-ink-2">
          <span className="ft-dot error mt-2" aria-hidden />
          <span>
            At {row.payers} parties you&apos;re <span className="ft-mono font-semibold text-ink">{dollars(overBudget)}</span> over your budget. Nothing is
            charged without asking.
          </span>
        </p>
      ) : null}
    </div>
  );
}
