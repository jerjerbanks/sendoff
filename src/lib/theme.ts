/**
 * Light / Dark / Auto theme. The source of truth is two attributes on <html>, set before
 * first paint by THEME_BOOT and kept in sync by setThemeMode:
 *   data-theme-mode: what the person picked (light | dark | auto)
 *   data-theme:      what is showing (light | dark)
 * The pick is stored in localStorage "ft-theme". With nothing stored the theme is LIGHT.
 * Auto follows the system's prefers-color-scheme and falls back to light when the system
 * reports no preference. There is no time-of-day logic (Jeremy's decision, Nov 24).
 */
export type ThemeMode = "light" | "dark" | "auto";
export const THEME_KEY = "ft-theme";
export const THEME_MODES: ThemeMode[] = ["light", "dark", "auto"];

/**
 * The no-flash boot script from the v5 pack's index.html, verbatim. It goes in <head>
 * before any CSS and sets the attributes before first paint.
 */
export const THEME_BOOT = `/* No-flash theme boot. Runs before first paint. Mode: light | dark | auto (localStorage "ft-theme"; default LIGHT).
   Auto follows the system prefers-color-scheme; if the system reports nothing, light. */
(function(){var K="ft-theme",d=document.documentElement,m;
try{m=localStorage.getItem(K)}catch(e){}
if(m!=="light"&&m!=="dark"&&m!=="auto")m="light";
function resolve(mode){if(mode!=="auto")return mode;
 return(window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches)?"dark":"light"}
d.setAttribute("data-theme",resolve(m));d.setAttribute("data-theme-mode",m);
window.__ftTheme={key:K,resolve:resolve};})();`;

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark" || value === "auto";
}

/** Light or dark for a mode, given whether the system asks for dark. */
export function resolveTheme(mode: ThemeMode, systemDark: boolean): "light" | "dark" {
  if (mode === "auto") return systemDark ? "dark" : "light";
  return mode;
}

function systemDark(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function getThemeMode(): ThemeMode {
  if (typeof document === "undefined") return "light";
  const mode = document.documentElement.getAttribute("data-theme-mode");
  return isThemeMode(mode) ? mode : "light";
}

function apply(mode: ThemeMode) {
  const root = document.documentElement;
  root.setAttribute("data-theme-mode", mode);
  root.setAttribute("data-theme", resolveTheme(mode, systemDark()));
}

/** Pick a mode: store it, show it, and tell every toggle on the page. */
export function setThemeMode(mode: ThemeMode) {
  try {
    localStorage.setItem(THEME_KEY, mode);
  } catch {
    // Private mode or blocked storage: the pick still applies to this page.
  }
  apply(mode);
}

let started = false;

/**
 * Keeps the page in step with the outside world: an OS switch while in Auto, and a pick
 * made in another tab. Safe to call more than once.
 */
export function startThemeSync() {
  if (started || typeof window === "undefined") return;
  started = true;
  window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
    if (getThemeMode() === "auto") apply("auto");
  });
  window.addEventListener("storage", (event) => {
    if (event.key === THEME_KEY && isThemeMode(event.newValue)) apply(event.newValue);
  });
}

/** Calls `listener` with the mode whenever it changes, from any source. Returns an unsubscribe. */
export function subscribeThemeMode(listener: (mode: ThemeMode) => void): () => void {
  const observer = new MutationObserver(() => listener(getThemeMode()));
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme-mode"] });
  return () => observer.disconnect();
}
