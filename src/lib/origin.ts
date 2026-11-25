import { headers } from "next/headers";

/**
 * The origin this request came in on, e.g. https://sendoff-staging.jccmiel92.workers.dev.
 * Read per request so staging and live each get their own absolute URLs (a build-time
 * value would bake in localhost). Workers don't set x-forwarded-proto, so any host other
 * than a local one is https.
 */
export async function requestOrigin(): Promise<string> {
  const list = await headers();
  const host = list.get("x-forwarded-host") ?? list.get("host") ?? "127.0.0.1:4747";
  const local = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?$/.test(host);
  const proto = list.get("x-forwarded-proto") ?? (local ? "http" : "https");
  return `${proto}://${host}`;
}
