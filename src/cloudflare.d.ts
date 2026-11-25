/** Workers Rate Limiting binding (the shape @cloudflare/workers-types gives it; merges if those are added). */
interface RateLimit {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

interface SendoffEnv {
  DB: D1Database;
  ASSETS: Fetcher;
  /** Joins per client IP: 10 per 60 s (wrangler.jsonc ratelimits). */
  JOIN_RATE_LIMITER: RateLimit;
  /** New trips per client IP: 5 per 60 s (wrangler.jsonc ratelimits). */
  CREATE_TRIP_RATE_LIMITER: RateLimit;
}

declare module "cloudflare:workers" {
  export const env: SendoffEnv;
}
