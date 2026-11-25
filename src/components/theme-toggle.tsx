"use client";

import { useEffect, useRef, useSyncExternalStore, type KeyboardEvent } from "react";
import { getThemeMode, setThemeMode, startThemeSync, subscribeThemeMode, THEME_MODES, type ThemeMode } from "@/lib/theme";

const LABELS: Record<ThemeMode, string> = {
  light: "Light",
  dark: "Dark",
  auto: "Auto: follows your device setting",
};

function Icon({ mode }: { mode: ThemeMode }) {
  if (mode === "light")
    return (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <circle cx="10" cy="10" r="3.5" />
        <path d="M10 1.5v2.5M10 16v2.5M1.5 10H4M16 10h2.5M4 4l1.8 1.8M14.2 14.2 16 16M4 16l1.8-1.8M14.2 5.8 16 4" />
      </svg>
    );
  if (mode === "dark")
    return (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path d="M16.5 12.5A7 7 0 0 1 7.5 3.5a7 7 0 1 0 9 9Z" />
      </svg>
    );
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <circle cx="10" cy="10" r="7" />
      <path d="M10 3a7 7 0 0 0 0 14Z" fill="currentColor" />
    </svg>
  );
}

/**
 * Light / Dark / Auto as a radiogroup of three 44px buttons. One component for the landing
 * nav and the app top bar; the state lives on <html> (see lib/theme), so every toggle on the
 * page, and every tab, stays in step. The checked look comes from CSS on <html>, so it is
 * right on first paint before this hydrates.
 */
export function ThemeToggle({ variant = "glass", className = "" }: { variant?: "glass" | "bar"; className?: string }) {
  const mode = useSyncExternalStore<ThemeMode | null>(subscribeThemeMode, getThemeMode, () => null);
  const group = useRef<HTMLDivElement>(null);
  useEffect(startThemeSync, []);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const current = THEME_MODES.indexOf(getThemeMode());
    const next = THEME_MODES[(current + step + THEME_MODES.length) % THEME_MODES.length];
    setThemeMode(next);
    group.current?.querySelector<HTMLButtonElement>(`[data-mode="${next}"]`)?.focus();
  }

  return (
    <div
      ref={group}
      className={`ft-theme ${variant === "bar" ? "bar" : ""} ${className}`}
      role="radiogroup"
      aria-label="Colour theme"
      onKeyDown={onKeyDown}
    >
      {THEME_MODES.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          data-mode={option}
          aria-checked={mode === option}
          aria-label={LABELS[option]}
          tabIndex={(mode ?? "light") === option ? 0 : -1}
          onClick={() => setThemeMode(option)}
        >
          <Icon mode={option} />
        </button>
      ))}
    </div>
  );
}
