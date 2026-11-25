"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/spring";

const COLORS = ["#e4c48a", "#f6f1e8", "#b7e0c8", "#f0b4c2", "#c9a86a"];

/** A short burst from the middle of the screen. Runs once on mount, then removes itself. */
export function Confetti({ pieces = 110, durationMs = 2200 }: { pieces?: number; durationMs?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || prefersReducedMotion()) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    const originY = h * 0.32;
    const bits = Array.from({ length: pieces }, () => {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
      const speed = 420 + Math.random() * 520;
      return {
        x: w / 2 + (Math.random() - 0.5) * 40,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 5 + Math.random() * 6,
        spin: (Math.random() - 0.5) * 14,
        turn: Math.random() * Math.PI,
        color: COLORS[Math.floor(Math.random() * COLORS.length)] ?? "#e4c48a",
        round: Math.random() < 0.3,
      };
    });
    let last = performance.now();
    const start = last;
    let frame = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const life = (now - start) / durationMs;
      ctx.clearRect(0, 0, w, h);
      for (const bit of bits) {
        bit.vy += 900 * dt; // gravity
        bit.vx *= 1 - 1.6 * dt; // air
        bit.vy *= 1 - 0.6 * dt;
        bit.x += bit.vx * dt;
        bit.y += bit.vy * dt;
        bit.turn += bit.spin * dt;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - Math.max(0, life - 0.6) / 0.4);
        ctx.translate(bit.x, bit.y);
        ctx.rotate(bit.turn);
        ctx.fillStyle = bit.color;
        if (bit.round) {
          ctx.beginPath();
          ctx.arc(0, 0, bit.size / 2.4, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // A flat strip that "flips" as it turns.
          ctx.fillRect(-bit.size / 2, (-bit.size / 4) * Math.abs(Math.cos(bit.turn * 1.7)), bit.size, (bit.size / 2) * Math.abs(Math.cos(bit.turn * 1.7)) + 1);
        }
        ctx.restore();
      }
      if (life < 1) frame = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, w, h);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [pieces, durationMs]);

  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-40 h-full w-full" aria-hidden />;
}

/** The "You're in." headline with a small pop, plus the burst. */
export function CommitCelebration({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || prefersReducedMotion()) return;
    ref.current.animate(
      [
        { transform: "scale(0.86)", opacity: 0 },
        { transform: "scale(1.04)", opacity: 1, offset: 0.6 },
        { transform: "scale(1)", opacity: 1 },
      ],
      { duration: 520, easing: "cubic-bezier(0.23, 1, 0.32, 1)" },
    );
  }, []);
  return (
    <>
      <Confetti />
      <div ref={ref}>{children}</div>
    </>
  );
}
