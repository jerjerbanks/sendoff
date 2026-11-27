/**
 * NEXT_PUBLIC_FT_VIBE_STEP: the v7 "What's the vibe?" step, the organizer theme override UI and
 * the ?ft-theme= QA preview. Off by default; on only in staging (set by `npm run build:staging`).
 * Inlined at build time, so it's the same on the server and in the browser.
 */
function read(): boolean {
  try {
    return process.env.NEXT_PUBLIC_FT_VIBE_STEP === "1";
  } catch {
    return false;
  }
}

export const VIBE_STEP_ON = read();
