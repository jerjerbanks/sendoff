import { env } from "cloudflare:workers";
import { headers } from "next/headers";
import { countHit, RATE_LIMITS, type RateBucket } from "./rate-limit";
import { hashToken } from "./tokens";

/** Buckets that also have a Workers Rate Limiting binding. "import" is D1-only. */
const BINDINGS: Record<RateBucket, "JOIN_RATE_LIMITER" | "CREATE_TRIP_RATE_LIMITER" | null> = {
  join: "JOIN_RATE_LIMITER",
  create: "CREATE_TRIP_RATE_LIMITER",
  import: null,
};

/**
 * Per-client-IP rate limit, checked before any other database work. Two
 * counters, and either one can refuse:
 * - Cloudflare's Workers Rate Limiting binding. On the live Worker it never
 *   refused anything (v1.17 logs), so it is kept only in case it starts working.
 * - A strict counter in D1 (rate_hits, migration 0008), in one-minute windows.
 * If either is missing or throws, that one lets the request through and logs a
 * warning: this guards against floods, and a broken limiter shouldn't lock
 * everyone out. Every check is logged for Workers Logs. The IP is never stored
 * or logged, only its SHA-256 hash (the first 8 characters in logs).
 */
export async function withinLimit(bucket: RateBucket): Promise<boolean> {
  const binding = BINDINGS[bucket];
  const limit = RATE_LIMITS[bucket];
  const limiter = binding ? env[binding] : undefined;
  const ip = (await headers()).get("cf-connecting-ip");
  const key = hashToken(ip ?? "unknown");
  const base = {
    event: "rate_limit",
    binding,
    bucket,
    joinBound: Boolean(env.JOIN_RATE_LIMITER),
    createBound: Boolean(env.CREATE_TRIP_RATE_LIMITER),
    limitIsFunction: typeof limiter?.limit === "function",
    hasIp: !!ip,
    keyHash: key.slice(0, 8),
  };

  let cf: "allowed" | "limited" | "binding_missing" | "threw" | "none" = binding ? "binding_missing" : "none";
  let cfResult: unknown;
  if (limiter && typeof limiter.limit === "function") {
    try {
      cfResult = await limiter.limit({ key: ip ?? "unknown" });
      cf = (cfResult as { success: boolean }).success ? "allowed" : "limited";
    } catch (error) {
      cf = "threw";
      cfResult = String(error);
    }
  }

  let d1: "allowed" | "limited" | "threw" = "allowed";
  let d1Count: number | null = null;
  try {
    d1Count = await countHit(env.DB, key, bucket, Date.now());
    d1 = d1Count > limit ? "limited" : "allowed";
  } catch (error) {
    d1 = "threw";
    cfResult = { cf: cfResult, d1Error: String(error) };
  }

  const allowed = cf !== "limited" && d1 !== "limited";
  const outcome = allowed ? "allowed" : "limited";
  const entry = { ...base, outcome, cf, d1, d1Count, limit, result: cfResult };
  if (cf === "binding_missing" || cf === "threw" || d1 === "threw") console.warn(entry);
  else console.log(entry);
  return allowed;
}
