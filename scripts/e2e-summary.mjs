// Turns Playwright's JSON report into a short Markdown summary for the Actions run page.
// Usage: node scripts/e2e-summary.mjs playwright-report/results.json
import { existsSync, readFileSync } from "node:fs";

const file = process.argv[2] ?? "playwright-report/results.json";
if (!existsSync(file)) {
  console.log("### e2e\n\nNo report was written (the run stopped before tests started).");
  process.exit(0);
}
const report = JSON.parse(readFileSync(file, "utf8"));
const rows = [];
function walk(suite, trail) {
  const here = suite.title ? [...trail, suite.title] : trail;
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) {
      rows.push({ title: [...here.slice(1), spec.title].join(" › "), status: test.status });
    }
  }
  for (const child of suite.suites ?? []) walk(child, here);
}
for (const suite of report.suites ?? []) walk(suite, []);

const icon = { expected: "✅", flaky: "⚠️", unexpected: "❌", skipped: "⏭️" };
const count = (status) => rows.filter((row) => row.status === status).length;
const base = process.env.E2E_BASE_URL ?? "";
console.log(`### e2e ${count("unexpected") ? "failed" : "passed"} against ${base}\n`);
console.log(`${count("expected")} passed · ${count("unexpected")} failed · ${count("flaky")} flaky · ${count("skipped")} skipped\n`);
console.log("| | Check |\n|---|---|");
for (const row of rows) console.log(`| ${icon[row.status] ?? row.status} | ${row.title.replace(/\|/g, "\\|")} |`);
