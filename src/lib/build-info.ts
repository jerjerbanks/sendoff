// Filled in at build time by vite.config.ts `define`. Unit tests and type checks run without
// it, so every read is guarded.
declare const __BUILD_ID__: string | undefined;
declare const __BUILD_DATE__: string | undefined;

/** Short commit of this build ("local" outside CI). */
export const BUILD_ID: string = typeof __BUILD_ID__ === "string" ? __BUILD_ID__ : "local";
/** Build day, YYYY-MM-DD in UTC. */
export const BUILD_DATE: string = typeof __BUILD_DATE__ === "string" ? __BUILD_DATE__ : "";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Test version · Nov 26 · 1a2b3c4": testers quote it in feedback so we know which build they saw. */
export function versionLine(id = BUILD_ID, date = BUILD_DATE): string {
  const [, month, day] = /^\d{4}-(\d{2})-(\d{2})$/.exec(date) ?? [];
  const when = month && day ? `${MONTHS[Number(month) - 1]} ${Number(day)}` : null;
  return ["Test version", when, id].filter(Boolean).join(" · ");
}
