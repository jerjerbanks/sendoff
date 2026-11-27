import { describe, expect, it } from "vitest";
import { MARK_SIZE, faces, fitLine, measure, paintCard } from "./og-card";

const SAFE = 1200 - 72 * 2;

describe("link-preview card text fitting", () => {
  it("keeps the whole money range, 'per party' included, on both demo cards", () => {
    for (const line of [
      "$1,060–$1,414 per party · 4 of 5 parties in · 8 going",
      "$639–$1,922 per party · 4 parties in · 10 going",
    ]) {
      const fitted = fitLine(faces.body, line);
      expect(fitted.startsWith(line.split(" · ")[0] ?? "")).toBe(true);
      expect(fitted).toContain("per party");
      expect(measure(faces.body, fitted)).toBeLessThanOrEqual(SAFE);
    }
  });

  it("drops whole trailing segments instead of cutting a word", () => {
    const long = "$1,060–$1,414 per party · 12 of 15 parties in · 38 going · commit by Tue, Dec 15";
    const fitted = fitLine(faces.body, long);
    expect(long.startsWith(fitted)).toBe(true);
    expect(fitted.endsWith("party") || fitted.endsWith("in") || fitted.endsWith("going")).toBe(true);
    expect(measure(faces.body, fitted)).toBeLessThanOrEqual(SAFE);
  });

  it("ellipsizes a single segment that can't fit, rather than clipping mid-letter", () => {
    const fitted = fitLine(faces.display, "Saint-Rémy-de-Provence bachelorette weekend");
    expect(fitted.endsWith("...")).toBe(true);
    expect(measure(faces.display, fitted)).toBeLessThanOrEqual(SAFE);
  });
});

describe("link-preview card logo", () => {
  it("paints the Out of the Chat mark in the top-right corner, clear of the text", () => {
    const image = paintCard({ eyebrow: "BACHELOR · 6 OF 8 IN", title: "Lake Tahoe", line: "$420 per party", foot: "Field Trip" });
    const width = 1200;
    const at = (x: number, y: number) => Array.from(image.subarray((y * width + x) * 4, (y * width + x) * 4 + 3));
    const x0 = width - 72 - MARK_SIZE;
    let painted = 0;
    for (let y = 48; y < 48 + MARK_SIZE; y += 4) for (let x = x0; x < x0 + MARK_SIZE; x += 4) if (at(x, y).join() !== "12,11,10") painted += 1;
    // A good share of the mark's box is drawn, and the mark's box is all background outside it.
    expect(painted).toBeGreaterThan(200);
    expect(at(x0 - 4, 100)).toEqual([12, 11, 10]);
  });

  it("keeps a long eyebrow clear of the mark", () => {
    const long = "BACHELORETTE · 12 OF 14 IN · COMMIT BY JAN 12 · LAKE TAHOE · SOUTH SHORE · CALIFORNIA";
    expect(measure(faces.label, fitLine(faces.label, long, 1200 - 144 - MARK_SIZE - 24))).toBeLessThanOrEqual(1200 - 144 - MARK_SIZE - 24);
  });
});
