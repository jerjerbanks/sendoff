/** Demo reset stays on unless DEMO_RESET=0. It only restores the seeded trip. */
export function demoResetAllowed(): boolean {
  return process.env.DEMO_RESET !== "0";
}
