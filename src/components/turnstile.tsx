"use client";

import { useEffect, useRef } from "react";

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface TurnstileApi {
  render(element: HTMLElement, options: Record<string, unknown>): string;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let loading: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile missing")));
    script.onerror = () => {
      loading = null;
      reject(new Error("Turnstile failed to load"));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/**
 * Cloudflare's bot check inside a form. It adds a hidden cf-turnstile-response field that the
 * server action verifies. Renders nothing while the check is off (no site key). Most people
 * never see it: it only asks for a tap when Cloudflare isn't sure.
 */
export function Turnstile({ siteKey }: { siteKey: string | null }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const form = box.current?.closest("form");
    if (!siteKey || !box.current || !form) return;
    let widgetId: string | undefined;
    let cancelled = false;
    let token = "";
    let held: { submitter: HTMLElement | null; timer: ReturnType<typeof setTimeout> } | null = null;
    const release = () => {
      if (!held) return;
      clearTimeout(held.timer);
      const submitter = held.submitter;
      held = null;
      form.requestSubmit(submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement ? submitter : undefined);
    };
    // A tap on submit before the check finishes waits for it (up to 8 seconds), so nobody
    // gets "couldn't confirm" just for being quick. After that the server decides. The
    // listener sits on the document in the capture phase so it runs before React's own
    // (on the app root), which would otherwise send the form at once.
    const onSubmit = (event: SubmitEvent) => {
      if (event.target !== form || token) return;
      event.preventDefault();
      event.stopPropagation();
      if (held) return;
      const timer = setTimeout(() => {
        token = "timeout";
        release();
      }, 8000);
      held = { submitter: event.submitter, timer };
    };
    document.addEventListener("submit", onSubmit, { capture: true });
    loadTurnstile()
      .then((api) => {
        if (cancelled || !box.current) return;
        widgetId = api.render(box.current, {
          sitekey: siteKey,
          appearance: "interaction-only",
          size: "flexible",
          callback: (value: string) => {
            token = value;
            release();
          },
          "expired-callback": () => {
            token = "";
          },
        });
      })
      .catch(() => {
        // Script blocked or offline: let a held submit go now; the server says what to do.
        token = "unavailable";
        release();
      });
    return () => {
      cancelled = true;
      document.removeEventListener("submit", onSubmit, { capture: true });
      if (held) clearTimeout(held.timer);
      if (widgetId) window.turnstile?.remove(widgetId);
    };
  }, [siteKey]);
  if (!siteKey) return null;
  return <div ref={box} data-turnstile className="empty:hidden" />;
}
