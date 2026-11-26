import { describe, expect, it } from "vitest";
import { versionLine } from "./build-info";

describe("versionLine", () => {
  it("names the build day and commit", () => {
    expect(versionLine("1a2b3c4", "2026-11-26")).toBe("Test version · Nov 26 · 1a2b3c4");
  });
  it("leaves out a missing date", () => {
    expect(versionLine("local", "")).toBe("Test version · local");
  });
});
