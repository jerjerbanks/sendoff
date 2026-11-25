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
  const amount = useRef<HTMLSpanElement>(null);
  const band = useRef<HTMLSpanElement>(null);
  const shown = useRef({ x: rows[startIndex]?.totalCents ?? 0, v: 0 });
  const row = rows[index] ?? rows[0];
  const target = row?.totalCents ?? 0;

  useEffect(() => {
    const paint = () => {
      if (amount.current) amount.current.textContent = dollars(shown.current.x);
      if (band.current && bandLowDeltaCents != null && bandHighDeltaCents != null) {
        band.current.textContent = `${dollars(shown.current.x + bandLowDeltaCents)}–${dollars(shown.current.x + bandHighDeltaCents)} with your flight`;
      }
    };
    const s = shown.current;
    if (prefersReducedMotion()) {
      s.x = target;
      paint();
      return;
    }
    let raf = 0;
    let last = 0;
    const { k, c } = SPRINGS.snappy;
    const frame = (now: number) => {
      const dt = Math.min(0.032, last ? (now - last) / 1000 : 1 / 60);
      last = now;
      [s.x, s.v] = springStep(s.x, s.v, target, k, dt, c);
      paint();
      if (Math.abs(s.x - target) > 50 || Math.abs(s.v) > 50) raf = requestAnimationFrame(frame);
      else {
        s.x = target;
        paint();
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [target, bandLowDeltaCents, bandHighDeltaCents]);

  if (rows.length < 2 || !row) return null;
  const now = rows.find((item) => item.payers === nowPayers);
  const diff = now ? row.totalCents - now.totalCents : null;
  const widest = Math.max(...rows.map((item) => dollars(item.totalCents).length));

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
  const x = (i: number) => padX + (i * (W - padX * 2)) / (rows.length - 1);
  const y = (cents: number) => top + ((hi - cents) / span) * (H - top - bottom);
  const line = rows.map((item, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(item.totalCents).toFixed(1)}`).join(" ");
  const area = `${line} L${x(rows.length - 1)},${H - bottom} L${x(0)},${H - bottom} Z`;
  const overBudget = budgetCents != null ? row.totalCents - budgetCents : null;

  return (
    <div className="select-none">
      <div className={compact ? "sr-only" : "ft-glow -mx-5 px-5 py-2"} aria-live="polite">
        {label ? <p className="ft-lbl">{label}</p> : null}
        <p className="ft-money mt-1 text-[68px]">
          <span ref={amount} className="inline-block" style={{ minWidth: `${widest - 0.6}ch` }}>
            {dollars(row.totalCents)}
          </span>
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
            onClick={() => setIndex(i)}
            className={`ft-mono !text-[16px] ${i === index ? "on" : ""} ${item.payers === nowPayers && i !== index ? "!text-clay-ink" : ""}`}
          >
            {item.payers}
          </button>
        ))}
      </div>

      <div className="ft-panel ft-dotgrid relative mt-3 overflow-hidden">
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
          <line x1={x(index)} x2={x(index)} y1={y(row.totalCents)} y2={H - bottom} stroke="var(--clay)" strokeWidth="1" strokeDasharray="2 3" />
          {rows.map((item, i) =>
            i === index ? null : (
              <rect key={item.payers} x={x(i) - 3.5} y={y(item.totalCents) - 3.5} width="7" height="7" fill="var(--lake)" stroke="var(--bg-surface)" strokeWidth="1" />
            ),
          )}
          <circle cx={x(index)} cy={y(row.totalCents)} r="6.5" fill="var(--clay)" stroke="var(--bg-surface)" strokeWidth="2" />
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
          className="ft-mono pointer-events-none absolute rounded-md bg-ink px-2.5 py-1 text-[15px] font-medium text-card shadow-[var(--shadow-2)] transition-[left,top] duration-[var(--dur-smooth)] ease-[var(--spring-smooth)]"
          style={{
            left: `clamp(8px, calc(${(x(index) / W) * 100}% - 40px), calc(100% - 92px))`,
            top: `max(6px, calc(${(y(row.totalCents) / H) * 100}% - 40px))`,
          }}
          aria-hidden
        >
          {dollars(row.totalCents)}
        </span>
      </div>
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
