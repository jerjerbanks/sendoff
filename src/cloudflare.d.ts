interface SendoffEnv {
  DB: D1Database;
  ASSETS: Fetcher;
}

declare module "cloudflare:workers" {
  export const env: SendoffEnv;
}
