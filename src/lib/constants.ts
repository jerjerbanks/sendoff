/** The product name people see. Provisional: change it here and it changes everywhere.
 * Infrastructure keeps the old name (Worker, D1 database, URL) so the live link holds. */
export const APP_NAME = "Field Trip";
export const ZONE = "America/Chicago";
/** The default demo: Scottsdale Golf Weekend (Demo Narratives v1). */
export const DEMO_TRIP_ID = "trip_golf";
export const DEMO_INVITE_TOKEN = "GOLF2027";
/** The retired bachelor demo. Wiped wherever it is still stored; never seeded again. */
export const RETIRED_DEMO_TRIP_ID = "trip_demo";
/** Holds a random session token, never a user id. __Host- means: this site only, HTTPS only, whole site. */
export const SESSION_COOKIE = "__Host-ft_session";
export const LAKE_TRIP_ID = "trip_lake";
export const LAKE_INVITE_TOKEN = "LAKE2027";
/** Carries a just-made sign-in link to the party page once. Path-scoped and short-lived. */
export const SIGN_IN_LINK_COOKIE = "ft_link";

// Public tester form: no sign-in, no email collection. FeedbackButton renders nothing if this is ever emptied.
export const FEEDBACK_URL = "https://docs.google.com/forms/d/e/1FAIpQLScAUKA2izW9IWHKVeHKxgO_AXta-h4dvMA4SpGqC2J-pmOkVg/viewform";

/** The app's own domain (custom domain on the live Worker). workers.dev keeps working too. */
export const APP_DOMAIN = "usefieldtrip.com";
/** Sign-in codes come from here. The domain is onboarded to Cloudflare Email Sending (SPF/DKIM/DMARC set). */
export const SIGN_IN_FROM = `signin@${APP_DOMAIN}`;
/** Ties an email sign-in code to the browser that asked for it. Path-scoped to /signin. */
export const SIGN_IN_TICKET_COOKIE = "ft_code";
