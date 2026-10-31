// Google Customer Reviews: Google's own opt-in dialog on the order confirmation. A buyer who opts in
// gets Google's survey by email after the estimated delivery date. The order details go to Google's
// script to show the dialog (see the Privacy page); the survey is sent only if the buyer says yes.

import config from "@config";
import { estimatedDelivery } from "./pricing";
import type { PendingPurchase } from "./checkout";
import { likelyInUS } from "./region";

declare global {
  interface Window {
    renderOptIn?: () => void;
    gapi?: {
      load(name: string, ready: () => void): void;
      surveyoptin: { render(options: Record<string, unknown>): void };
    };
  }
}

function ymd(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Printed books ship to the US only. A PDF's "delivery" country is our best guess at where the buyer is. */
function deliveryCountry(pending: PendingPurchase) {
  if (pending.shipping || likelyInUS()) return "US";
  const region = (navigator.language || "").split("-")[1];
  return region && /^[A-Za-z]{2}$/.test(region) ? region.toUpperCase() : "US";
}

export function showReviewOptIn(pending: PendingPurchase, orderId: string, email: string | undefined) {
  if (!email) return;
  // The latest date in the printed book's delivery window; a PDF arrives right away.
  const delivered = pending.shipping ? estimatedDelivery(pending.shipping, new Date(pending.timestamp)).latest : new Date(pending.timestamp);
  window.renderOptIn = () => {
    window.gapi?.load("surveyoptin", () => {
      window.gapi?.surveyoptin.render({
        merchant_id: config.tracking.googleMerchantId,
        order_id: orderId,
        email,
        delivery_country: deliveryCountry(pending),
        estimated_delivery_date: ymd(delivered),
      });
    });
  };
  if (window.gapi?.surveyoptin) {
    window.renderOptIn();
    return;
  }
  const script = document.createElement("script");
  script.src = "https://apis.google.com/js/platform.js?onload=renderOptIn";
  script.async = true;
  script.defer = true;
  document.body.appendChild(script);
}
