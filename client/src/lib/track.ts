/**
 * Funnel events pushed to the GTM dataLayer.
 *
 * GTM (GTM-TL24S7M7) is the single place that forwards these to GA4, the Meta Pixel
 * and the TikTok Pixel (P0-7). Each event carries an `event_id` so the server-side
 * Conversions API can deduplicate against the browser event.
 */

export type FunnelEvent =
  | "view_content" // theme selected
  | "generate_lead" // email submitted / account created for preview
  | "begin_checkout"
  | "purchase"
  | "sign_up"
  | "start_creation"
  | "wizard_step" // moved forward in the wizard (step_name)
  | "create_book" // story submitted (language, art style, photo, cast size)
  | "book_ready" // all pictures drawn while the buyer watched
  | "view_book" // opened a book page (purchased or not)
  | "open_print_order"
  | "add_shipping_info"; // address checked, order summary shown

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

function eventId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function track(event: FunnelEvent, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const id = (params.event_id as string | undefined) ?? eventId();
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, event_id: id, ...params });
  return id;
}

/** Virtual page views for client-side navigation (GTM "History Change" also works). */
export function trackPageView(path: string, title: string) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: "page_view", page_path: path, page_title: title });
}

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref", "code"] as const;
const UTM_STORAGE = "sb_attribution";

/** Save first-touch UTM parameters and affiliate/discount codes for attaching to orders. */
export function captureAttribution() {
  if (typeof window === "undefined") return;
  try {
    const params = new URLSearchParams(window.location.search);
    const found: Record<string, string> = {};
    for (const key of UTM_KEYS) {
      const value = params.get(key);
      if (value) found[key] = value.slice(0, 200);
    }
    if (Object.keys(found).length === 0) return;
    const existing = JSON.parse(localStorage.getItem(UTM_STORAGE) || "null");
    if (!existing) {
      localStorage.setItem(UTM_STORAGE, JSON.stringify({ ...found, landing_page: window.location.pathname, captured_at: new Date().toISOString() }));
    }
  } catch {
    // Storage can be blocked (private mode, in-app browsers); attribution is best-effort.
  }
}

export function getAttribution(): Record<string, string> | null {
  try {
    return JSON.parse(localStorage.getItem(UTM_STORAGE) || "null");
  } catch {
    return null;
  }
}
