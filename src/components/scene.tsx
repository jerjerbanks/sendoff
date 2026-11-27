"use client";

import type { CSSProperties, ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { NIGHT_SCENE, sceneForPage, sceneUrl, type SceneName } from "@/lib/scenes";
import { activeTripTheme, type TripTheme } from "@/lib/trip-theme";

/**
 * v6 illustration layer. Everything here is decorative and presentational: it reads
 * props the page already has and never fetches.
 */

/** The v5 hill-and-pine silhouette, filled with the page colour. Sits on the bottom edge of every header. */
export function Ridge({ className = "" }: { className?: string }) {
  return (
    <svg className={`ft-ridge ${className}`} viewBox="0 0 390 64" preserveAspectRatio="none" aria-hidden focusable="false">
      <g fill="currentColor">
        <path d="M0 40 C60 22 120 30 190 38 S320 26 390 34 V64 H0Z" />
        <path d="M18 24 C20.5 32 26.4 50 28.4 64 H7.6 C9.6 50 15.5 32 18 24Z" />
        <path d="M40 10 C43.4 20.8 51.3 45.1 54.1 64 H25.9 C28.7 45.1 36.6 20.8 40 10Z" />
        <path d="M62 30 C64.1 36.8 69.1 52.1 70.9 64 H53.1 C54.9 52.1 59.9 36.8 62 30Z" />
        <path d="M330 18 C332.9 27.2 339.7 47.9 342 64 H318 C320.3 47.9 327.1 27.2 330 18Z" />
        <path d="M352 4 C355.8 16 364.6 43 367.6 64 H336.4 C339.4 43 348.2 16 352 4Z" />
        <path d="M374 26 C376.4 33.6 382 50.7 383.9 64 H364.1 C366 50.7 371.6 33.6 374 26Z" />
      </g>
    </svg>
  );
}

/**
 * Illustrated header. The scene is a CSS background so only the current theme's image
 * downloads (day in light, lake-night in dark). Decorative, so it has no alt text.
 */
export function SceneHeader({ scene, size = "lg" }: { scene: SceneName; size?: "lg" | "sm" }) {
  const style = { "--scene-day": `url(${sceneUrl(scene)})`, "--scene-night": `url(${sceneUrl(NIGHT_SCENE)})` } as CSSProperties;
  return (
    <div className={`ft-scene ${size}`} style={style} aria-hidden>
      <Ridge />
    </div>
  );
}

/** The derived theme, or the staging-only ?ft-theme= preview when the flag is on. */
export function useTripTheme(derived: TripTheme, flagOn: boolean): TripTheme {
  const params = useSearchParams();
  return activeTripTheme(derived, flagOn ? params?.get("ft-theme") : null, flagOn);
}

/**
 * v7: sets data-trip-theme on the trip shell's wrapper (never <html>, so it doesn't fight the
 * light/dark data-theme script). The theme is derived on the server from data the page already
 * loaded; this only applies the staging QA override.
 */
export function TripThemeRoot({ derived, flagOn, className, children }: { derived: TripTheme; flagOn: boolean; className?: string; children: ReactNode }) {
  const theme = useTripTheme(derived, flagOn);
  return (
    <div data-trip-theme={theme} className={className}>
      {children}
    </div>
  );
}

/** Trip shell header: big on trip home, short on Vote / Costs / Commit, hidden on tool screens. Scene from the v6.5 page map + theme. */
export function TripScene({ tripId, theme: derived, flagOn }: { tripId: string; theme: TripTheme; flagOn: boolean }) {
  const pathname = usePathname();
  const theme = useTripTheme(derived, flagOn);
  const base = `/trip/${tripId}`;
  const segment = pathname.startsWith(base) ? (pathname.slice(base.length).split("/")[1] ?? "") : "";
  if (segment === "") return <SceneHeader scene={sceneForPage("home", theme)} size="lg" />;
  if (segment === "vote" || segment === "costs" || segment === "pay") return <SceneHeader scene={sceneForPage(segment, theme)} size="sm" />;
  return null;
}
