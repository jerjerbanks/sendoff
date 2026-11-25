/**
 * Spring physics shared by CSS and JS. The CSS linear() curves in tokens.css are
 * sampled from these same k/c values (mass 1), so a JS ticker and a CSS transition
 * started together land together.
 */
export const SPRINGS = {
  /** k520 c36 ≈ 413ms: select/lift, headcount cells, toasts, number tickers. */
  snappy: { k: 520, c: 36 },
  /** k260 c32 ≈ 600ms: page slides, tab thumb, sheets. */
  smooth: { k: 260, c: 32 },
  /** k900 c52 ≈ 323ms: press and toggles. */
  micro: { k: 900, c: 52 },
} as const;

export type SpringName = keyof typeof SPRINGS;

/** One semi-implicit Euler step of a damped spring pulling `x` toward `target`. */
export function springStep(x: number, v: number, target: number, k: number, dt: number, c = 2 * Math.sqrt(k)): [number, number] {
  const next = v + (-k * (x - target) - c * v) * dt;
  return [x + next * dt, next];
}

/** True when the device asks for less motion. Safe on the server. */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

/** Ease for colour and opacity fades. */
export const EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)";
