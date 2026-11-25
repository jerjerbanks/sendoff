/** The product name people see. Provisional: change it here and it changes everywhere.
 * Infrastructure keeps the old name (Worker, D1 database, URL) so the live link holds. */
export const APP_NAME = "Field Trip";
export const ZONE = "America/Chicago";
export const DEMO_TRIP_ID = "trip_demo";
export const DEMO_INVITE_TOKEN = "ALEX2027";
/** Holds a random session token, never a user id. __Host- means: this site only, HTTPS only, whole site. */
export const SESSION_COOKIE = "__Host-ft_session";
export const LAKE_TRIP_ID = "trip_lake";
export const LAKE_INVITE_TOKEN = "LAKE2027";
/** Carries a just-made sign-in link to the party page once. Path-scoped and short-lived. */
export const SIGN_IN_LINK_COOKIE = "ft_link";

// Public tester form: no sign-in, no email collection. FeedbackButton renders nothing if this is ever emptied.
export const FEEDBACK_URL = "https://docs.google.com/forms/d/e/1FAIpQLScAUKA2izW9IWHKVeHKxgO_AXta-h4dvMA4SpGqC2J-pmOkVg/viewform";
