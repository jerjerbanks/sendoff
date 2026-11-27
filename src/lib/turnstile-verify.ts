/**
 * Cloudflare Turnstile (free bot check) on create-trip and join. This file is the pure part,
 * so unit tests can run it without the Worker runtime; turnstile.ts reads the keys.
 */

export const TURNSTILE_FIELD = "cf-turnstile-response";
export const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export type TurnstileOutcome = "off" | "passed" | "failed" | "missing" | "unreachable";

/**
 * Check one widget token with Cloudflare. "off" when no secret is configured (the check is
 * switched off until the keys are set). "unreachable" when Cloudflare can't be asked; the
 * caller lets that through, since the rate limits still apply and an outage at Cloudflare
 * shouldn't lock everyone out.
 */
export async function verifyTurnstile(input: {
  secret: string | null;
  token: string;
  ip: string | null;
  fetcher?: typeof fetch;
}): Promise<TurnstileOutcome> {
  if (!input.secret) return "off";
  if (!input.token) return "missing";
  const body = new FormData();
  body.set("secret", input.secret);
  body.set("response", input.token.slice(0, 2048));
  if (input.ip) body.set("remoteip", input.ip);
  try {
    const response = await (input.fetcher ?? fetch)(SITEVERIFY_URL, { method: "POST", body });
    if (!response.ok) return "unreachable";
    const result = (await response.json()) as { success?: boolean };
    return result.success === true ? "passed" : "failed";
  } catch {
    return "unreachable";
  }
}

/** Whether a submission may go ahead. */
export function turnstileAllows(outcome: TurnstileOutcome): boolean {
  return outcome === "off" || outcome === "passed" || outcome === "unreachable";
}
