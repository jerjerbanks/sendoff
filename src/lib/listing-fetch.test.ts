import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { fetchListing } from "./listing-fetch";

/** Saved raw HTML of www.airbnb.com/rooms/201621. No live fetches in tests. */
const html = readFileSync(path.join(__dirname, "fixtures/airbnb", "rooms-201621.html.gz"));

function respond(body: BodyInit | null, init: ResponseInit & { url?: string } = {}): typeof fetch {
  return (async () => {
    const response = new Response(body, init);
    Object.defineProperty(response, "url", { value: init.url ?? "https://www.airbnb.com/rooms/201621" });
    return response;
  }) as typeof fetch;
}

describe("fetchListing", () => {
  it("sends one GET for the canonical URL with a desktop browser UA and a timeout", async () => {
    const calls: [string, RequestInit | undefined][] = [];
    const { gunzipSync } = await import("node:zlib");
    const fake = (async (url: string, init?: RequestInit) => {
      calls.push([url, init]);
      const response = new Response(gunzipSync(html));
      Object.defineProperty(response, "url", { value: url });
      return response;
    }) as typeof fetch;
    const result = await fetchListing("201621", fake);
    expect(result.ok).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe("https://www.airbnb.com/rooms/201621");
    expect(calls[0][1]?.method).toBe("GET");
    expect(calls[0][1]?.cache).toBe("no-store");
    expect(calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
    expect((calls[0][1]?.headers as Record<string, string>)["User-Agent"]).toMatch(/Chrome\/\d+/);
  });

  it("reports a block, a redirect away, a timeout and a network error", async () => {
    expect(await fetchListing("1", respond("denied", { status: 403 }))).toEqual({ ok: false, reason: "http_403", bedrooms: null });
    expect(await fetchListing("1", respond("<html></html>", { url: "https://www.airbnb.com/login" }))).toEqual({ ok: false, reason: "no_state", bedrooms: null });
    expect(await fetchListing("1", respond("<html></html>", { url: "https://captcha.example/x" }))).toEqual({ ok: false, reason: "not_airbnb", bedrooms: null });
    const timeout = (async () => {
      throw new DOMException("timed out", "TimeoutError");
    }) as typeof fetch;
    expect(await fetchListing("1", timeout)).toEqual({ ok: false, reason: "timeout", bedrooms: null });
    const offline = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;
    expect(await fetchListing("1", offline)).toEqual({ ok: false, reason: "network", bedrooms: null });
  });

  it("stops reading a page that's far too big", async () => {
    const huge = new Uint8Array(3_100_000).fill(32);
    expect(await fetchListing("1", respond(huge))).toEqual({ ok: false, reason: "too_large", bedrooms: null });
  });
});
