"use client";

import { useState } from "react";
import { APP_NAME } from "@/lib/constants";

/** Clipboard API first; in-app browsers without it get the old textarea + execCommand path. */
export async function copyText(value: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const area = document.createElement("textarea");
    area.value = value;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

/** "Copy link" with a visible, announced confirmation. */
export function CopyLinkButton({ url, className = "" }: { url: string; className?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  return (
    <>
      <button
        type="button"
        onClick={async () => setState((await copyText(url)) ? "copied" : "failed")}
        className={`inline-flex h-12 min-w-11 items-center rounded-2xl border border-line bg-chip px-4 text-sm font-semibold text-ink ${className}`}
      >
        {state === "copied" ? "Copied ✓" : "Copy link"}
      </button>
      <p role="status" aria-live="polite" className={state === "idle" ? "sr-only" : "w-full text-sm text-muted"}>
        {state === "copied" ? "Copied. Paste it in your group chat." : state === "failed" ? `Couldn't copy. Press and hold to copy: ${url}` : ""}
      </p>
    </>
  );
}

export function ShareButton({
  title,
  text,
  url,
  smsHref,
}: {
  title: string;
  text: string;
  url: string;
  smsHref: string;
}) {
  const [note, setNote] = useState("");

  async function share() {
    const payload = { title, text, url };
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share(payload);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    window.location.href = smsHref;
    setNote("Opened your messages app with the text filled in. Nothing opened? Use Copy link.");
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => void share()}
        className="inline-flex h-12 items-center rounded-2xl border border-line bg-chip px-4 text-sm font-semibold text-ink"
      >
        Send to group chat
      </button>
      <CopyLinkButton url={url} />
      <a className="inline-flex min-h-11 items-center px-1 text-sm font-semibold text-clay-ink" href={smsHref}>
        Text it
      </a>
      {note ? <p className="w-full text-sm text-muted">{note}</p> : null}
    </div>
  );
}

/** Hands a personal link to the share sheet (AirDrop, notes, a text to yourself), or copies it. */
export function SendToSelfButton({ url }: { url: string }) {
  const [note, setNote] = useState("");

  async function send() {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: `Sign in to ${APP_NAME}`, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setNote("Copied. Paste it on your other phone.");
    } catch {
      setNote("Copy the link above by hand.");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => void send()}
        className="inline-flex h-12 items-center rounded-2xl border border-line bg-chip px-4 text-sm font-semibold text-ink"
      >
        Send it to my other phone
      </button>
      {note ? <p className="w-full text-sm text-muted">{note}</p> : null}
    </div>
  );
}
