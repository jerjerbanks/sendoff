import { describe, expect, it, vi } from "vitest";
import { SITEVERIFY_URL, turnstileAllows, verifyTurnstile } from "./turnstile-verify";

const answer = (body: unknown, ok = true) => vi.fn(async () => new Response(JSON.stringify(body), { status: ok ? 200 : 500 }));

describe("verifyTurnstile", () => {
  it("is off without a secret, and never calls Cloudflare", async () => {
    const fetcher = answer({ success: true });
    expect(await verifyTurnstile({ secret: null, token: "t", ip: null, fetcher })).toBe("off");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("refuses a missing token without asking", async () => {
    const fetcher = answer({ success: true });
    expect(await verifyTurnstile({ secret: "s", token: "", ip: null, fetcher })).toBe("missing");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("sends secret, token and IP to siteverify and reads success", async () => {
    const fetcher = answer({ success: true });
    expect(await verifyTurnstile({ secret: "s", token: "tok", ip: "1.2.3.4", fetcher })).toBe("passed");
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(SITEVERIFY_URL);
    const body = init.body as FormData;
    expect([body.get("secret"), body.get("response"), body.get("remoteip")]).toEqual(["s", "tok", "1.2.3.4"]);
    expect(await verifyTurnstile({ secret: "s", token: "tok", ip: null, fetcher: answer({ success: false }) })).toBe("failed");
  });

  it("treats Cloudflare errors as unreachable", async () => {
    expect(await verifyTurnstile({ secret: "s", token: "t", ip: null, fetcher: answer({}, false) })).toBe("unreachable");
    const boom = vi.fn(async () => {
      throw new Error("down");
    });
    expect(await verifyTurnstile({ secret: "s", token: "t", ip: null, fetcher: boom })).toBe("unreachable");
  });

  it("lets through off, passed and unreachable only", () => {
    expect(["off", "passed", "unreachable", "failed", "missing"].map((o) => turnstileAllows(o as never))).toEqual([true, true, true, false, false]);
  });
});
