"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/** Keep in step with PING_INTERVAL_MS in lib/activity (client bundles can't import server code). */
const PING_MS = 60_000;
const TICK_MS = 5_000;
/** Time counts only while the tab is visible and the person touched it within this window. */
const IDLE_MS = 60_000;

function send(body: Record<string, unknown>) {
  try {
    void fetch("/api/ping", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
      credentials: "same-origin",
    }).catch(() => {});
  } catch {
    // Analytics never gets in the way.
  }
}

function countsAsAppPage(path: string): boolean {
  return path === "/trips" || path === "/new" || path.startsWith("/new/") || path.startsWith("/trip/");
}

/**
 * Time in the app for the operator's /admin page. Counts 5-second ticks while a trip page
 * is visible and touched in the last minute, and sends them once a minute (and when the tab
 * hides). The server ignores anyone not signed in, demo sign-ins and the demo trips.
 */
export function ActivityPing() {
  const pathname = usePathname() ?? "/";
  const path = useRef(pathname);
  path.current = pathname;

  useEffect(() => {
    let active = 0;
    let lastInput = Date.now();
    let sinceSend = 0;
    const touched = () => {
      lastInput = Date.now();
    };
    const flush = () => {
      if (active > 0 && countsAsAppPage(path.current)) send({ s: Math.round(active / 1000), path: path.current });
      active = 0;
      sinceSend = 0;
    };
    const tick = window.setInterval(() => {
      if (document.visibilityState === "visible" && Date.now() - lastInput < IDLE_MS && countsAsAppPage(path.current)) active += TICK_MS;
      sinceSend += TICK_MS;
      if (sinceSend >= PING_MS) flush();
    }, TICK_MS);
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    for (const name of events) window.addEventListener(name, touched, { passive: true, capture: true });
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.clearInterval(tick);
      for (const name of events) window.removeEventListener(name, touched, { capture: true });
      document.removeEventListener("visibilitychange", onHide);
    };
  }, []);

  return null;
}

/** Counts one invite-link open per tab, from the browser so link-preview bots don't count. */
export function InviteOpened({ token }: { token: string }) {
  useEffect(() => {
    const key = `ft-invite-open:${token}`;
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, "1");
    } catch {
      // Private mode: count it anyway.
    }
    send({ invite: token });
  }, [token]);
  return null;
}
