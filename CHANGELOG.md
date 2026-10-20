# Changelog

All notable changes to storybloom.ai. Newest first.

## Unreleased (branch `holiday-2026`)

### Front end rebuilt on the live backend, plus SEO foundations (P0-3, P1-1, groundwork for P0-6/P0-7/P0-8)

The production front-end source was never pushed to GitHub. This branch rebuilds it from the newest repo code, wired to the existing live backend (same Cognito user pool, same API Gateway endpoints, same Stripe and Lulu request payloads), so sign-in, checkout and print ordering keep working unchanged.

- **One config file** (`storybloom.config.ts`) for prices, shipping, holiday cutoff dates, feature flags and tracking IDs. Current live prices are unchanged; the proposed P0-5 prices are in the file behind `useProposedPricing: false`.
- **Guided creation wizard** at `/create`: child's name, age and pronouns → their look → story theme → art style → extra touches (favorite animal, toy, hobby, dedication, author name, length) → create. Answers survive the sign-up round trip. The free-form prompt is kept as "Advanced: write your own story" at `/create/custom`.
- **7 structured story templates**: Saves Christmas, Night at the North Pole, Lost Reindeer, First Hanukkah Lights, Birthday Adventure, Space Explorer, Big Brother/Sister. Each has a fixed plot outline, illustration guidance and the child's name in the title.
- **Holiday shipping banner** driven by `printCutoffDate` / `expressCutoffDate`, with a countdown in the final week, an express-only phase, and an "instant gift" phase. Print checkout shows estimated delivery dates and a "may not arrive by December 25" warning after the cutoffs.
- **Prerendered pages** (22) with unique titles, descriptions, canonical URLs, Open Graph/Twitter share images, and structured data (Organization, WebSite, Product with real offers, BreadcrumbList, FAQPage, Book). No review/rating markup.
- **Landing pages**: `/christmas-book-for-kids`, `/hanukkah-book-for-kids`, `/personalized-birthday-book`, `/new-sibling-book`, `/gift-for-grandchild`, `/personalized-space-book`. `/personalized-book-with-childs-photo` is built but hidden until `features.photoUpload` is on.
- **Example books** prerendered at `/examples/<slug>` with full story text, from a snapshot of the public examples API (`npm run fetch:examples`).
- `sitemap.xml`, `robots.txt`, a real 404 page, and a CloudFront function for clean URLs (`deploy/`).
- **Speed**: images converted to WebP (style previews were 4 MB PNGs each, now ~30 KB), self-hosted fonts, inlined CSS, logged-in pages code-split, Amplify loaded only for signed-in visitors. Measured LCP on an emulated mid-range phone over slow 4G: about 0.7–1.8 s.
- **Tracking groundwork**: funnel events pushed to the GTM dataLayer (`view_content`, `generate_lead`, `sign_up`, `begin_checkout`, `purchase` with value and the Stripe session ID as `event_id`), plus first-touch UTM and `?code=` capture. GTM tags for GA4/Meta/TikTok still need to be set up (P0-7).
- **Fixes**: header/footer use real links (crawlable), one H1 per page, brand purple darkened for WCAG contrast, legal pages get real H1s, privacy policy no longer shows today's date as "last updated", pinch-zoom re-enabled.
- Removed: the broken "Pro plan" subscription page (its checkout URL was an unfilled template string), the dead `/stories/:id/edit` page, and the Replit dev banner script.

### Repo hygiene
- Restored the 8 PNG assets that the `Replit-Changes` commit had corrupted (text-encoded binaries), and added `.gitattributes` so images are always treated as binary.

### P0-1: Remove fake testimonials
- Removed the "Sarah M.", "Michael R." and "Emma L." testimonials from the pricing page. The business has no customers yet, so they could not be real.
- Added a `VerifiedReviews` section that renders nothing unless it is given reviews tied to a real order ID with the buyer's display consent. It shows first name and last initial only.
- Removed two other unsupported claims from the pricing page: the "Most Popular" badge and tagline (no sales yet), and "printing stories worldwide" (the print checkout only accepts US addresses).
- Still to do (needs backend + email service): the in-app review form, storage with the order ID, and the post-delivery "leave a review" email.
