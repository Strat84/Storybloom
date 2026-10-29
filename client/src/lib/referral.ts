// Partner program (Referralful). The snippet records partner-link visits (?via=...) in a cookie on
// storybloom.ai and exposes the visitor's referral id as window.AffID.referral. Checkout sends that
// id to the backend, which puts it on the Stripe Checkout Session so Referralful credits the partner.
// Partner discount codes work without any of this; links need it.

import config from "@config";

declare global {
  interface Window {
    AffID?: { referral?: string };
  }
}

const SNIPPET = "https://cdn.jsdelivr.net/gh/mihir-kanzariya/affiliate-script@0.4/dist/aff.min.js";

/** Loads the tracking snippet once, if the Referralful account is configured. */
export function loadReferralTracking() {
  const account = config.partners.referralfulAccount;
  if (!account || typeof document === "undefined" || document.getElementById("referralful")) return;
  const s = document.createElement("script");
  s.id = "referralful";
  s.async = true;
  s.src = SNIPPET;
  s.dataset.account = account;
  s.dataset.trackUrl = "https://api.referralful.com";
  document.head.appendChild(s);
}

/** The visitor's referral id, read at checkout time (not page load). */
export function currentReferral(): string | undefined {
  try {
    return window.AffID?.referral || undefined;
  } catch {
    return undefined;
  }
}
