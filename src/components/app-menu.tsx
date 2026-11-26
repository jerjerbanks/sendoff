"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FeedbackButton } from "@/components/feedback-button";
import { copyText } from "@/components/share-button";
import { ThemeToggle } from "@/components/theme-toggle";

export interface MenuShare {
  title: string;
  text: string;
  url: string;
}

/**
 * The app's phone menu: a modal <dialog> sheet, the same pattern as the landing page's
 * LandingMenu. Escape, the close button and a tap on the backdrop all close it, and focus
 * goes back to the Menu button. The five TripNav tabs are unchanged; this holds the rest.
 */
export function AppMenu({ tripId, isOrganizer, share }: { tripId: string; isOrganizer: boolean; share: MenuShare | null }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    const onClose = () => {
      setOpen(false);
      setNote("");
      opener.current?.focus({ preventScroll: true });
    };
    el.addEventListener("close", onClose);
    return () => el.removeEventListener("close", onClose);
  }, []);

  function show() {
    dialog.current?.showModal();
    setOpen(true);
  }
  const close = () => dialog.current?.close();

  async function invite() {
    if (!share) return;
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share(share);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    setNote((await copyText(share.url)) ? "Invite link copied. Paste it in your group chat." : `Copy this link: ${share.url}`);
  }

  const base = `/trip/${tripId}`;
  const links: [string, string][] = [
    ["/trips", "Your trips"],
    [`${base}/party`, "Your party"],
    [`${base}/budget`, "Your budget"],
    ...(isOrganizer
      ? ([
          [`${base}/organize`, "Organizer"],
          [`${base}/settings`, "Settings"],
        ] as [string, string][])
      : []),
  ];
  const row = "flex min-h-[52px] w-full items-center border-b border-line text-left text-[18px] font-medium tracking-[-0.01em] text-ink";

  return (
    <>
      <button
        ref={opener}
        type="button"
        className="inline-flex h-11 min-w-11 shrink-0 items-center rounded-full border border-line px-3.5 text-sm font-semibold text-ink"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={show}
      >
        Menu
      </button>
      <dialog
        ref={dialog}
        aria-label="Menu"
        className="fixed inset-x-0 top-0 m-0 max-h-dvh w-full max-w-none overflow-y-auto rounded-b-2xl border-0 bg-paper px-4 pt-3 pb-[calc(20px+env(safe-area-inset-bottom))] text-ink shadow-xl backdrop:bg-black/45"
        onClick={(event) => {
          if (event.target === dialog.current) close();
        }}
      >
        <div className="mx-auto flex max-w-lg flex-col gap-2">
          <div className="flex min-h-12 items-center justify-between">
            <span className="ft-lbl ink">Menu</span>
            <button type="button" className="grid size-11 place-items-center rounded-full text-ink-2" aria-label="Close menu" onClick={close}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                <path d="M3 3l12 12M15 3 3 15" />
              </svg>
            </button>
          </div>
          <nav aria-label="More" className="flex flex-col border-t border-line">
            {share ? (
              <button type="button" className={row} onClick={() => void invite()}>
                Invite people
              </button>
            ) : null}
            {links.map(([href, label]) => (
              <Link key={href} href={href} className={row} onClick={close}>
                {label}
              </Link>
            ))}
          </nav>
          <p role="status" aria-live="polite" className={note ? "text-sm text-muted break-all" : "sr-only"}>
            {note}
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <FeedbackButton />
            <ThemeToggle variant="bar" />
          </div>
        </div>
      </dialog>
    </>
  );
}
