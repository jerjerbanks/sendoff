import { describe, expect, it } from "vitest";
import { isThemeMode, resolveTheme, THEME_BOOT, THEME_KEY } from "./theme";

describe("theme", () => {
  it("resolves light and dark as picked, whatever the system says", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
  it("Auto follows the system, and is light when the system says nothing", () => {
    expect(resolveTheme("auto", true)).toBe("dark");
    expect(resolveTheme("auto", false)).toBe("light");
  });
  it("only accepts the three modes", () => {
    expect(["light", "dark", "auto"].every(isThemeMode)).toBe(true);
    expect(isThemeMode("system")).toBe(false);
    expect(isThemeMode(null)).toBe(false);
  });
  it("boot script defaults to light and reads the same key", () => {
    expect(THEME_KEY).toBe("ft-theme");
    expect(THEME_BOOT).toContain('K="ft-theme"');
    expect(THEME_BOOT).toContain('m="light"');
    expect(THEME_BOOT).not.toMatch(/getHours|Date\(/);
  });
});
