import { describe, expect, it } from "vitest";
import { faces, fitLine, measure } from "./og-card";

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
