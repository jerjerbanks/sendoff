import { env } from "cloudflare:workers";
import { headers } from "next/headers";
import { turnstileAllows, TURNSTILE_FIELD, verifyTurnstile } from "./turnstile-verify";

/**
 * Keys come from the Worker: TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY, both set as
 * secrets (so a deploy never wipes them). With either missing the check is off and the
 * widget doesn't render. Staging uses Cloudflare's public always-pass test keys.
 */
function keys(): { siteKey: string; secret: string } | null {
  const values = env as unknown as { TURNSTILE_SITE_KEY?: string; TURNSTILE_SECRET_KEY?: string };
  const siteKey = values.TURNSTILE_SITE_KEY?.trim();
  const secret = values.TURNSTILE_SECRET_KEY?.trim();
  return siteKey && secret ? { siteKey, secret } : null;
}

/** The public site key for the widget, or null while the check is off. */
export function turnstileSiteKey(): string | null {
  return keys()?.siteKey ?? null;
}

/** Server side of the check, for a form that carried the widget. Logs the outcome, never the token. */
export async function passesTurnstile(formData: FormData, bucket: "create" | "join"): Promise<boolean> {
  const configured = keys();
  const outcome = await verifyTurnstile({
    secret: configured?.secret ?? null,
    token: String(formData.get(TURNSTILE_FIELD) ?? ""),
    ip: (await headers()).get("cf-connecting-ip"),
  });
  if (outcome !== "off") console.log(JSON.stringify({ event: "turnstile", bucket, outcome }));
  return turnstileAllows(outcome);
}
