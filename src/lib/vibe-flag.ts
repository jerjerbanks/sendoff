/**
 * NEXT_PUBLIC_FT_THEME_PREVIEW: the ?ft-theme= QA preview (one page view shows another trip look,
 * nothing saved). Off by default; on only in staging (set by `npm run build:staging`).
 * Inlined at build time, so it's the same on the server and in the browser.
 * The "What's the vibe?" step and Settings → Trip look are on everywhere (no flag).
 */
function read(): boolean {
  try {
    return process.env.NEXT_PUBLIC_FT_THEME_PREVIEW === "1";
  } catch {
    return false;
  }
}

export const THEME_PREVIEW_ON = read();
