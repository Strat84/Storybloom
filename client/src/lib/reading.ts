/**
 * How people read and buy their book, recorded for our own analysis (backend:
 * PUT /stories/{id}/preview-count with {events}, functions/story/updatePreviewCount.js) and
 * mirrored to the GTM dataLayer as "reading_*" events for GA4.
 *
 * Events are queued and sent in small batches: every few seconds, and when the page is hidden
 * (fetch keepalive, so the last page turn isn't lost when someone closes the tab).
 */
import config from "@config";
import { api, getIdToken } from "./api";

export type ReadingEventName =
  | "book_open"
  | "page_view"
  | "read_complete"
  | "reader_open"
  | "reader_close"
  | "buy_view"
  | "cta_click"
  | "proof_open"
  | "proof_confirm"
  | "checkout_start"
  | "checkout_error"
  | "redraw_request"
  | "redraw_limit_hit"
  | "locked_view"
  | "survey_answer"
  | "survey_dismiss"
  | "more_redraws"
  | "fix_open";

export interface ReadingEvent {
  name: ReadingEventName;
  page?: number;
  of?: number;
  /** Time spent on the page being left, in ms. */
  ms?: number;
  cta?: string;
  category?: string;
  answer?: string;
  source?: string;
  /** "inline" (book page) or "reader" (full-screen reading). */
  view?: string;
  /** more_redraws only: what still isn't right, in their words. */
  text?: string;
}

const FLUSH_MS = 5000;
const queues = new Map<string, (ReadingEvent & { at: number; device: string })[]>();
let timer: number | null = null;
let listening = false;
/** Set when the backend raises the book's redraw limit (reading to the end, starting to buy). */
let onLimit: ((storyId: string, limit: number) => void) | null = null;

function device() {
  if (typeof window === "undefined") return "unknown";
  return window.matchMedia?.("(max-width: 767px)").matches ? "mobile" : "desktop";
}

export function onRedrawLimitRaised(fn: typeof onLimit) {
  onLimit = fn;
}

export function recordReading(storyId: string | undefined, event: ReadingEvent) {
  if (!storyId || typeof window === "undefined") return;
  const queue = queues.get(storyId) ?? [];
  queue.push({ ...event, at: Date.now(), device: device() });
  queues.set(storyId, queue);
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: `reading_${event.name}`, story_id: storyId, ...event, name: undefined });
  if (!listening) {
    listening = true;
    document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && void flushReading(true));
    window.addEventListener("pagehide", () => void flushReading(true));
  }
  if (timer === null) timer = window.setTimeout(() => void flushReading(), FLUSH_MS);
}

export async function flushReading(leaving = false) {
  if (timer !== null) {
    window.clearTimeout(timer);
    timer = null;
  }
  const batches = Array.from(queues.entries()).filter(([, q]) => q.length);
  queues.clear();
  if (!batches.length) return;
  const token = await getIdToken().catch(() => null);
  if (!token) return;
  await Promise.all(
    batches.map(async ([storyId, events]) => {
      try {
        const res = await fetch(`${config.api.baseUrl}/stories/${storyId}/preview-count`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ events }),
          keepalive: leaving,
        });
        if (!leaving && res.ok) {
          const data = await res.json().catch(() => null);
          if (data?.regenerationLimit && onLimit) onLimit(storyId, Number(data.regenerationLimit));
        }
      } catch {
        // Best effort: reading analytics never get in the way of reading.
      }
    }),
  );
}

/**
 * The "out of redraws" popup: send the reason now and get the new limit back.
 * granted false: too short (400) or this book already got its extra redraws.
 */
export async function requestMoreRedraws(storyId: string, ask: { category?: string; text: string; page?: number }) {
  try {
    return await api<{ granted: boolean; regenerationLimit?: number; added?: number; error?: string }>(`/stories/${storyId}/preview-count`, {
      method: "PUT",
      body: { events: [{ name: "more_redraws", ...ask, at: Date.now(), device: device() }] },
    });
  } catch (err) {
    return { granted: false, error: (err as Error).message };
  }
}

/** Where this visit came from, for "book_open" (e.g. "email:book_offer_first"). */
export function openSource() {
  if (typeof window === "undefined") return "";
  const q = new URLSearchParams(window.location.search);
  if (q.get("new") === "1") return "created";
  if (q.get("purchased") === "1") return "purchased";
  const src = q.get("utm_source");
  return src ? `${src}:${q.get("utm_campaign") ?? ""}`.slice(0, 60) : document.referrer ? "link" : "direct";
}
