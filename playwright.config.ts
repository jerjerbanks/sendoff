import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end checks against a running app.
 *
 *   E2E_BASE_URL=https://sendoff-staging.jccmiel92.workers.dev npm run e2e     # staging (CI does this after each PR deploy)
 *   npm run dev & npm run e2e                                                   # local dev server on :4747
 *   E2E_BASE_URL=https://sendoff.jccmiel92.workers.dev npm run e2e:smoke       # live: read-only @smoke subset
 *
 * The demo trips are one shared state on the server, so tests run one at a time.
 * Tests assert words, numbers and roles, never layout or styling, so a redesign
 * that keeps the behavior keeps them green.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  // One retry absorbs a cold Worker or a slow D1 round trip; a real regression fails twice.
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI
    ? [["list"], ["github"], ["html", { open: "never" }], ["json", { outputFile: "playwright-report/results.json" }]]
    : [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:4747",
    ...devices["iPhone 13"],
    // Chromium only (installed in CI); keeps the phone viewport and touch.
    browserName: "chromium",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
