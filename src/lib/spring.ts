/**
 * Critically damped spring step: no overshoot wobble, settles with weight.
 * Pull `x` toward `target` with stiffness `k`; damping is 2√k.
 */
export function springStep(x: number, v: number, target: number, k: number, dt: number): [number, number] {
  const c = 2 * Math.sqrt(k);
  const next = v + (-k * (x - target) - c * v) * dt;
  return [x + next * dt, next];
}

/** True when the device asks for less motion. Safe on the server. */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

/** Ease for things arriving on screen. */
export const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
