import { canonicalListingUrl, parseListingHtml, type ImportRoom } from "./listing-import";

/** A current desktop Chrome. Airbnb serves its full page (with the embedded state) to browsers. */
const DESKTOP_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export const FETCH_TIMEOUT_MS = 8_000;
/** Listing pages are ~600–750 KB. Stop reading past this. */
const MAX_BYTES = 3_000_000;

export type ListingFetchReason =
  | "timeout"
  | "network"
  | `http_${number}`
  | "not_airbnb"
  | "too_large"
  | "no_state"
  | "no_stops"
  | "parse_error";

export type ListingFetchResult =
  | { ok: true; rooms: ImportRoom[]; bedrooms: number | null }
  | { ok: false; reason: ListingFetchReason; bedrooms: number | null };

async function readCapped(response: Response): Promise<string | null> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) {
      await reader.cancel();
      return null;
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

/**
 * One GET of the canonical listing URL: desktop browser UA, 8 s timeout, no
 * retries, nothing cached. Never throws; every failure has a reason for the
 * log and sends the organizer to the paste-text fallback.
 */
export async function fetchListing(listingId: string, fetcher: typeof fetch = fetch): Promise<ListingFetchResult> {
  let response: Response;
  try {
    response = await fetcher(canonicalListingUrl(listingId), {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        "User-Agent": DESKTOP_UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
  } catch (error) {
    const name = (error as { name?: string })?.name;
    return { ok: false, reason: name === "TimeoutError" || name === "AbortError" ? "timeout" : "network", bedrooms: null };
  }
  // A redirect to a login, captcha or another site is a block.
  try {
    const host = new URL(response.url || canonicalListingUrl(listingId)).hostname;
    if (host !== "www.airbnb.com" && host !== "airbnb.com") {
      await response.body?.cancel();
      return { ok: false, reason: "not_airbnb", bedrooms: null };
    }
  } catch {
    return { ok: false, reason: "not_airbnb", bedrooms: null };
  }
  if (response.status !== 200) {
    await response.body?.cancel();
    return { ok: false, reason: `http_${response.status}`, bedrooms: null };
  }
  let html: string | null;
  try {
    html = await readCapped(response);
  } catch (error) {
    const name = (error as { name?: string })?.name;
    return { ok: false, reason: name === "TimeoutError" || name === "AbortError" ? "timeout" : "network", bedrooms: null };
  }
  if (html === null) return { ok: false, reason: "too_large", bedrooms: null };
  return parseListingHtml(html);
}
