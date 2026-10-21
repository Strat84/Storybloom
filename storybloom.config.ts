/**
 * StoryBloom site configuration: the ONE place for prices, dates and offer flags.
 *
 * Edit the values below and rebuild (`npm run build`). No other code changes needed.
 *
 * IMPORTANT about prices: the amount a customer is actually charged is set by the
 * Stripe checkout on the backend, not by this file. The `live` prices here are what
 * the site DISPLAYS and must match what the backend charges. Only switch
 * `useProposedPricing` on after the backend charges the proposed prices too.
 */

export type ProductId =
  | "digitalPdf"
  | "softcover"
  | "hardcover"
  | "grandparentBundle"
  | "giftWrap";

export interface ShippingMethod {
  id: "standard" | "express";
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

  pricing: {
    currency: "USD",
    /**
     * What the live backend charges today. Leave these until Matt approves new prices
     * AND the backend is updated to charge them.
     */
    live: {
      digitalPdf: 2.99,
      /** Printed book price by page count (the backend picks the tier from page count). */
      printByPages: { 10: 16.99, 15: 18.99, 20: 20.99 } as Record<10 | 15 | 20, number>,
    },
    /** P0-5 proposal. Not shown or charged while `useProposedPricing` is false. */
    proposed: {
      digitalPdf: 9.99,
      softcover: 29.99,
      hardcover: 34.99,
      grandparentBundle: 54.99,
      giftWrap: 4.99,
    } as Record<ProductId, number>,
    useProposedPricing: false,
    shipping: [
      { id: "standard", label: "Standard", price: 6.69, minDays: 11, maxDays: 13 },
      { id: "express", label: "Express", price: 21.74, minDays: 6, maxDays: 8 },
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
