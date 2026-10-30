// Partner program (Referralful). The snippet in index.html records partner-link visits (?via=...) in a
// cookie on storybloom.ai and exposes the visitor's referral id as window.AffID.referral. Checkout sends
// that id to the backend, which puts it on the Stripe Checkout Session so Referralful credits the partner.
// Partner discount codes work without any of this; links need it.

declare global {
  interface Window {
    AffID?: { referral?: string };
  }
}

/** The visitor's referral id, read at checkout time (not page load). */
export function currentReferral(): string | undefined {
  try {
    return window.AffID?.referral || undefined;
  } catch {
    return undefined;
  }
}
