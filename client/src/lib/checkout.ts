import config from "@config";
import type { PrintOrder } from "@/components/PrintOrderDialog";
import { api, checkoutUrlFrom, getIdToken, type DownloadOption, type StoryListItem } from "./api";
import { digitalPrice } from "./pricing";
import { track } from "./track";

/** Set before redirecting to Stripe; read when the buyer comes back. */
export const PENDING_PURCHASE = "pendingPurchase";

export interface PendingPurchase {
  storyId: string;
  downloadOption: DownloadOption;
  value?: number;
  timestamp: number;
}

export function readPendingPurchase(): PendingPurchase | null {
  try {
    const pending = JSON.parse(localStorage.getItem(PENDING_PURCHASE) || "null") as PendingPurchase | null;
    // Abandoned checkouts expire after two hours.
    if (pending && Date.now() - pending.timestamp > 2 * 60 * 60 * 1000) {
      clearPendingPurchase();
      return null;
    }
    return pending;
  } catch {
    return null;
  }
}

export function clearPendingPurchase() {
  try {
    localStorage.removeItem(PENDING_PURCHASE);
    localStorage.removeItem("pendingPreviewUnlock");
  } catch {
    // Ignore.
  }
}

export function hasPaid(story: StoryListItem | undefined, option: DownloadOption) {
  if (!story) return false;
  if (story.downloadHistory?.some((d) => d.downloadOption === option && d.status === "paid" && d.downloadable === "Yes")) return true;
  return story.downloadable === "Yes" && story.downloadStatus === "paid" && story.downloadOption === option;
}

/** What the buyer paid for this story's PDF, credited toward the printed book (0 if none). */
export function pdfCreditFor(story: StoryListItem | undefined) {
  if (!hasPaid(story, "pdf_only") || hasPaid(story, "pdf_and_book")) return 0;
  const paid = story?.downloadHistory?.find((d) => d.downloadOption === "pdf_only" && d.status === "paid" && Number(d.paidAmount) > 0)?.paidAmount;
  return Number(paid) > 0 ? Number(paid) : digitalPrice();
}

export function isPurchased(story: StoryListItem | undefined) {
  return hasPaid(story, "pdf_only") || hasPaid(story, "pdf_and_book");
}

export async function loadStoryList() {
  const data = await api<{ stories?: StoryListItem[] } | StoryListItem[]>("/stories");
  return Array.isArray(data) ? data : data.stories ?? [];
}

async function startCheckout(
  storyId: string,
  path: "/stripe/story-download-session" | "/stripe/story-download-book",
  body: unknown,
  pending: { downloadOption: DownloadOption; value: number },
) {
  track("begin_checkout", { value: pending.value, currency: config.pricing.currency, items: [{ item_id: pending.downloadOption }] });
  const data = await api(path, { method: "POST", body });
  const url = checkoutUrlFrom(data);
  if (!url) throw new Error("Checkout link not found");
  localStorage.setItem(PENDING_PURCHASE, JSON.stringify({ storyId, ...pending, timestamp: Date.now() }));
  window.location.href = url;
}

export function buyDigital(storyId: string) {
  return startCheckout(
    storyId,
    "/stripe/story-download-session",
    { storyId, downloadOption: "pdf_only" },
    { downloadOption: "pdf_only", value: digitalPrice() },
  );
}

export function buyPrint(order: PrintOrder) {
  return startCheckout(
    order.storyId,
    "/stripe/story-download-book",
    {
      storyId: order.storyId,
      pageCount: order.pageCount,
      shippingOption: order.shipping,
      copies: order.copies,
      // The backend recomputes the price; this is only logged if it differs.
      totalPrice: Number(order.totalPrice.toFixed(2)),
      shippingAddress: {
        name: order.address.name.trim(),
        line1: order.address.street1.trim(),
        line2: order.address.street2.trim() || undefined,
        city: order.address.city.trim(),
        state: order.address.state_code,
        postalCode: order.address.postcode,
        country: order.address.country_code,
        phone: order.address.phone_number,
      },
    },
    { downloadOption: "pdf_and_book", value: order.totalPrice },
  );
}

/** Fire the purchase event once, with a deterministic id for server-side deduplication. */
export function trackPurchase(pending: PendingPurchase) {
  const sessionId = new URLSearchParams(window.location.search).get("session_id");
  const eventId = sessionId ?? `${pending.storyId}:${pending.downloadOption}:${pending.timestamp}`;
  track("purchase", {
    event_id: eventId,
    transaction_id: eventId,
    value: pending.value,
    currency: config.pricing.currency,
    items: [{ item_id: pending.downloadOption }],
  });
}

/**
 * After returning from Stripe, wait for the webhook to mark the story paid (it can
 * take a few seconds), then record the purchase. Resolves true when confirmed.
 */
export async function confirmPendingPurchase(onList?: (list: StoryListItem[]) => void, attempts = 8): Promise<boolean> {
  const pending = readPendingPurchase();
  if (!pending) return false;
  for (let i = 0; i < attempts; i++) {
    const list = await loadStoryList().catch(() => null);
    if (list) {
      onList?.(list);
      if (hasPaid(list.find((s) => s.storyId === pending.storyId), pending.downloadOption)) {
        clearPendingPurchase();
        trackPurchase(pending);
        return true;
      }
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
  return false;
}

export async function downloadPdf(storyId: string, title?: string) {
  const token = await getIdToken();
  const res = await fetch(`${config.api.baseUrl}/stories/${storyId}/export-pdf`, {
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const link = document.createElement("a");
  link.download = `${(title || "Story").replace(new RegExp("[^\\p{L}\\p{N}]+", "gu"), "_")}.pdf`;
  if ((res.headers.get("content-type") ?? "").includes("application/json")) {
    const data = await res.json();
    const href = data.downloadUrl || data.url || data.pdfUrl;
    if (!href) throw new Error(data.message || "No download link provided");
    link.href = href;
    link.target = "_blank";
  } else {
    link.href = URL.createObjectURL(await res.blob());
  }
  document.body.appendChild(link);
  link.click();
  link.remove();
}
