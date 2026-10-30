/**
 * StoryBloom site configuration: the ONE place for prices, dates and offer flags.
 *
 * Edit the values below and rebuild (`npm run build`). No other code changes needed.
 *
 * IMPORTANT about prices: the amount a customer is charged is set by the backend's
 * Stripe checkout (services/pricing.js in storybloom-backend). Keep the prices here
 * and there the same.
 */

export interface ShippingMethod {
  id: "standard" | "priority" | "expedited";
  /** Lulu shipping level used for this option. */
  luluLevel: "MAIL" | "PRIORITY_MAIL" | "EXPEDITED";
  label: string;
  price: number;
  /** Business days from order to delivery, used for estimated delivery dates. */
  minDays: number;
  maxDays: number;
}

/** Build-time override from Vite env vars (unset in production builds). */
function env(name: string): string | undefined {
  const value = (import.meta as { env?: Record<string, string | undefined> }).env?.[name];
  return value ? value : undefined;
}

const config = {
  site: {
    name: "StoryBloom",
    /** Canonical address. Amplify redirects storybloom.ai to www, so www is the primary host. */
    url: "https://www.storybloom.ai",
    supportEmail: "support@storybloom.ai",
    /** Used in titles and share cards. */
    tagline: "Personalized storybooks starring your child",
    social: {
      tiktok: "",
      instagram: "",
      facebook: "",
      youtube: "",
    },
  },

  /**
   * Production backend. A staging build can point at the dev backend (Stripe test mode) by
   * setting VITE_API_BASE_URL, VITE_USER_POOL_ID and VITE_USER_POOL_CLIENT_ID at build time.
   */
  api: {
    baseUrl: env("VITE_API_BASE_URL") ?? "https://cjnwxolfm2.execute-api.us-east-1.amazonaws.com/prod",
    /** Public Cognito identifiers (safe to ship in the browser; they are not secrets). */
    cognito: {
      userPoolId: env("VITE_USER_POOL_ID") ?? "us-east-1_AR2R0wGOk",
      userPoolClientId: env("VITE_USER_POOL_CLIENT_ID") ?? "5i7gbv9mbgqfed8in84jku430b",
    },
  },

  /**
   * Prices shown on the site. The backend charges the same amounts
   * (services/pricing.js in storybloom-backend); change both together.
   */
  pricing: {
    currency: "USD",
    /** Digital PDF. Credited toward the printed book if bought first. */
    digitalPdf: 4.99,
    /** Printed softcover, any length (10–20 story pages), standard shipping included. */
    printBook: 34.99,
    /** Each additional copy of the same book, shipped together. */
    extraCopy: 19.99,
    maxCopies: 5,
    /** Hardcover is planned (needs a 24+ page layout); off until built. */
    hardcover: 49.99,
    /**
     * Delivery days are production + transit estimates in business days.
     * Confirm with Lulu before relying on them for holiday cutoffs.
     */
    shipping: [
      { id: "standard", label: "Standard", price: 0, minDays: 8, maxDays: 13, luluLevel: "MAIL" },
      { id: "priority", label: "Priority", price: 9.99, minDays: 6, maxDays: 9, luluLevel: "PRIORITY_MAIL" },
      { id: "expedited", label: "Expedited", price: 14.99, minDays: 4, maxDays: 6, luluLevel: "EXPEDITED" },
    ] as ShippingMethod[],
  },

  holiday: {
    /** Feature the holiday stories (homepage order, "Holiday books" nav link) until bannerEndDate. */
    seasonActive: true,
    /** Turn the site-wide holiday shipping banner on or off. */
    bannerEnabled: true,
    /**
     * Last day to order with standard / express shipping for Christmas delivery, e.g. "2026-12-08".
     * Leave null until confirmed with Lulu. While either is null, the shipping banner, countdown,
     * cutoff FAQ and "may not arrive by Dec 25" warnings are all hidden.
     */
    printCutoffDate: null as string | null,
    expressCutoffDate: null as string | null,
    christmasDate: "2026-12-25",
    /** Show a live countdown when the cutoff is this many days away or fewer. */
    countdownDays: 7,
    /** Stop featuring the holiday season and hide the banner after this date. */
    bannerEndDate: "2026-12-26",
  },

  /**
   * Partner program (/partners). Keep these the same as storybloom-outreach/config/settings.yaml
   * and the Referralful campaign; the page and the outreach emails both quote them.
   */
  partners: {
    /** Discount a partner's code gives their audience. */
    customerDiscountPct: 10,
    /** Commission on what the customer pays (before shipping and tax). One rate for every partner. */
    creatorPct: 20,
    orgPct: 20,
    /** Months a partner earns on a customer they referred, counted from that customer's first order. */
    commissionMonths: 12,
    /** Days before a commission is payable (refunds and reprints settle first). */
    holdDays: 30,
    /** Free printed book after this many referred printed books ship, then one per rewardEvery. */
    rewardFirstAt: 5,
    rewardEvery: 10,
    /**
     * Where "Join" goes: the Referralful partner portal (sign-up and partner dashboard).
     */
    applyUrl: "https://story-bloom.referralful.com",
  },

  /** Feature flags. Flip to true only when the feature is actually live. */
  features: {
    /** P0-2: upload a photo (optional) and the child becomes the illustrated hero. */
    photoUpload: true,
    /** P0-5: gift certificates. Needs backend support before turning on. */
    giftCertificates: false,
    /** P0-1: endpoint that returns verified buyer reviews. Keep false until it exists. */
    reviewsApi: false,
    /** Hardcover option (confirm Lulu supports it first). */
    hardcover: false,
  },

  story: {
    pageCounts: [10, 15, 20] as const,
    defaultPageCount: 10 as 10 | 15 | 20,
    ageRanges: ["3-5 years", "5-7 years", "7-9 years"] as const,
    /** Maps the art style to the backend's imageStyleId. */
    imageStyleIds: { traditional: 0, anime: 1, "3d": 2, chibi: 3 } as const,
    /** Free previews per story before the paywall (set by the backend; shown for copy only). */
    freePreviews: 3,
    /** Image regenerations per story (set by the backend; shown for copy only). */
    regenerationLimit: 5,
  },

  tracking: {
    /** Google Tag Manager container already on the live site. */
    gtmId: "GTM-TL24S7M7",
  },
};

export default config;
export type SiteConfig = typeof config;
