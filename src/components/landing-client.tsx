"use client";

import { useEffect, useRef, useState } from "react";
import { getThemeMode, isThemeMode, setThemeMode, startThemeSync, subscribeThemeMode } from "@/lib/theme";

function reducedMotion() {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Wires up the landing page's static markup after it paints:
 * - the theme toggle drawn in the hero's app preview, bound to the same store as the nav's
 * - the audience switcher: on desktop the tabs pick the highlighted card; on phone the cards
 *   are a scroll-snap row that starts on "Families" and the tabs follow the scroll
 */
export function LandingEnhance() {
  useEffect(() => {
    startThemeSync();
    const cleanups: (() => void)[] = [];

    // Preview toggle(s) in the static markup.
    const groups = Array.from(document.querySelectorAll<HTMLElement>(".ftl [data-theme-toggle]"));
    const syncChecked = () => {
      const mode = getThemeMode();
      for (const group of groups)
        for (const button of Array.from(group.querySelectorAll<HTMLButtonElement>("button[data-mode]")))
          button.setAttribute("aria-checked", String(button.dataset.mode === mode));
    };
    for (const group of groups) {
      const onClick = (event: MouseEvent) => {
        const mode = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-mode]")?.dataset.mode;
        if (isThemeMode(mode)) setThemeMode(mode);
      };
      group.addEventListener("click", onClick);
      cleanups.push(() => group.removeEventListener("click", onClick));
    }
    syncChecked();
    cleanups.push(subscribeThemeMode(syncChecked));

    // Audience switcher.
    const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>(".ftl .switch button"));
    const cards = Array.from(document.querySelectorAll<HTMLElement>(".ftl .aud .ac"));
    const row = document.querySelector<HTMLElement>(".ftl .aud");
    if (row && tabs.length && cards.length) {
      const isRow = () => getComputedStyle(row).display === "flex";
      const centre = (card: HTMLElement) => card.offsetLeft - row.offsetLeft - (row.clientWidth - card.clientWidth) / 2;
      const pick = (index: number, scroll: boolean) => {
        tabs.forEach((tab, j) => tab.setAttribute("aria-selected", String(index === j)));
        cards.forEach((card, j) => card.classList.toggle("inv", index === j));
        if (scroll && isRow()) row.scrollTo({ left: centre(cards[index]), behavior: reducedMotion() ? "auto" : "smooth" });
      };
      tabs.forEach((tab, index) => {
        const onClick = () => pick(index, true);
        tab.addEventListener("click", onClick);
        cleanups.push(() => tab.removeEventListener("click", onClick));
      });
      if (isRow()) row.scrollLeft = centre(cards[1]);
      let timer: ReturnType<typeof setTimeout> | undefined;
      const onScroll = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          if (!isRow()) return;
          const mid = row.scrollLeft + row.clientWidth / 2;
          let best = 0;
          let bestDistance = Infinity;
          cards.forEach((card, j) => {
            const distance = Math.abs(card.offsetLeft - row.offsetLeft + card.clientWidth / 2 - mid);
            if (distance < bestDistance) {
              bestDistance = distance;
              best = j;
            }
          });
          pick(best, false);
        }, 90);
      };
      row.addEventListener("scroll", onScroll, { passive: true });
      cleanups.push(() => {
        clearTimeout(timer);
        row.removeEventListener("scroll", onScroll);
      });
    }
    return () => cleanups.forEach((cleanup) => cleanup());
  }, []);
  return null;
}

const LINKS = [
  ["#how", "How it works"],
  ["#for", "For organizers"],
  ["#pricing", "Pricing"],
] as const;

/**
 * Below 1024px the nav collapses to a "Menu" button that opens a sheet with the same three
 * links plus "Start a trip". The sheet is a modal <dialog>, so focus stays inside it until it
 * closes (Escape, the close button, a tap outside, or picking a link).
 */
export function LandingMenu() {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    const onClose = () => {
      setOpen(false);
      opener.current?.focus({ preventScroll: true });
    };
    el.addEventListener("close", onClose);
    return () => el.removeEventListener("close", onClose);
  }, []);

  function show() {
    dialog.current?.showModal();
    setOpen(true);
  }

  return (
    <>
      <button ref={opener} className="menu" type="button" aria-haspopup="dialog" aria-expanded={open} onClick={show}>
        Menu
      </button>
      <dialog
        ref={dialog}
        className="sheet"
        aria-label="Menu"
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current?.close();
        }}
      >
        <div className="sheet-in">
          <div className="sheet-h">
            <span className="eb">Menu</span>
            <button type="button" className="sheet-x" aria-label="Close menu" onClick={() => dialog.current?.close()}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                <path d="M3 3l12 12M15 3 3 15" />
              </svg>
            </button>
          </div>
          <nav aria-label="Sections">
            {LINKS.map(([href, label]) => (
              <a key={href} href={href} onClick={() => dialog.current?.close()}>
                {label}
              </a>
            ))}
          </nav>
          <a className="pill clay" href="/new">
            Start a trip
          </a>
        </div>
      </dialog>
    </>
  );
}
