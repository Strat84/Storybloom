# Changelog

All notable changes to storybloom.ai. Newest first.

## Unreleased (branch `holiday-2026`)

### Languages, typeset cover titles, follow-up emails, international buyers, tracking
- **21 book languages** (wizard "Language of the book", defaults to the browser language, `?lang=` for ads): English, Spanish, French, German, Italian, Portuguese, Dutch, Polish, Turkish, Russian, Ukrainian, Arabic, Hindi, Chinese (Simplified/Traditional), Japanese, Korean, Vietnamese, Thai, Filipino, Indonesian. Text direction is automatic on the book page and editor.
- **Cover titles are typeset, not drawn by AI** (backend): exact spelling in every script, including Arabic, Chinese, Japanese and Korean, plus emoji. PDFs typeset text the comic font can't show.
- **Follow-up emails** (backend + SES): 12 and 36 hours after a book is made if it isn't bought, with the cover and one-click unsubscribe.
- **Outside the US** (by time zone) the book page leads with the $4.99 PDF; printed books still ship to US addresses only.
- **Home page** leads with photos, families and languages; the photo-to-cartoon demo moved up. Ad copy drafts in `docs/meta-ad-copy.md`.
- **Tracking:** new funnel events (wizard_step, create_book, view_book, book_ready, open_print_order, add_shipping_info) and a GTM import file (`deploy/gtm-container.json`) for GA4 + Meta Pixel.
- PDF file names keep non-English letters.

### New example books and a photo-to-cartoon showcase
- **Four new example books** made with the current story wizard and illustration pipeline (staging, QA account), replacing the four books from the previous model:
  - Mia Saves Christmas (Christmas, Traditional, with brother and puppy)
  - Noah's Birthday Adventure (Birthday, Chibi, with grandma and friend)
  - Captain Courage and the Runaway Balloon (superhero, written with "Write your own story", 3D)
  - Sofia the Space Explorer (Space, Anime, with cat)
- Cards and book pages show who's in the book, which story it came from and the art style. Dedications appear above page 1. Each landing page shows a matching example.
- `npm run fetch:examples` now snapshots the books listed in `scripts/example-sources.json` (needs an ID token). The old example URLs 301 to `/examples`.
- **"From one photo to the star of the story"** section on the home page and the photo landing page: one AI-generated photo of a fictional child, drawn in all four art styles by the same code customers' photos go through. Labeled as AI-generated.

### New pricing, watermarked preview, print-first, families and "write your own story" (P0-5)
- **Prices (approved by Matt)**: printed softcover **$34.99 with free standard shipping** (any length), digital PDF **$4.99**, extra copies **+$19.99** each (up to 5, shipped together), Priority **+$9.99**, Expedited **+$14.99**. Lulu shipping levels MAIL / PRIORITY_MAIL / EXPEDITED. All prices live in `storybloom.config.ts` (front end) and `services/pricing.js` (backend), which must match; the backend computes every charge.
- **PDF credit**: buying the PDF first takes what was paid off the printed book. The order screen shows the amount actually paid, so earlier $2.99 buyers see $2.99.
- **Watermarked preview** replaces the blur: every page is readable with a "PREVIEW · StoryBloom" watermark until purchase, and the cover stays clean.
- **Printed book is the default**: the main button orders the printed book, and the order starts with a page-by-page proof the buyer approves.
- **Whole-family stories**: up to 7 extra people or pets, with "Add another person/pet" buttons.
- **"Write your own story"** is now one of two equal choices on the Story step, next to "Pick one of our stories". `/create/custom` redirects there.
- **Boy or girl** replaces the pronoun picker, with Man/Woman for parents and grandparents. They/them was removed.
- Verified on staging with Stripe test mode and the Lulu sandbox: a custom family story, the $4.99 PDF, print with credit ($30.00), and 2 copies with Priority ($59.98, Lulu job with quantity 2 and PRIORITY_MAIL). Single-page and cover redraws were also tested.

### Photo likeness, multi-person stories, and a frictionless buying flow (P0-2, P0-3, P0-4)
- **Wizard rebuilt**: Hero → Look (upload 1–3 photos *or* describe) → Friends (optional siblings, friends, grown-ups or pets, each by photo or description) → Story → Style → Create. Account sign-up/sign-in happens inline on the last step, with no page change.
- **Photos are optional** everywhere. They're resized in the browser, checked for blur, checked server-side for no face/several people/blur with friendly messages, sent only with the parent's consent, stored privately under the story, auto-deleted within 30 days, and never used to train AI.
- **One continuous flow**: story text (~1 min) → pictures start automatically (~1 min) → the buyer watches the book fill in on the new **book page** (`/book/:id`): cover + first 3 pages free, the rest blurred behind "Unlock the whole book", digital and printed options on the same page, sticky mobile "Get the book" bar. Stripe returns buyers to their book, which unlocks automatically.
- **Account page**: "Delete my photos and books".
- **Privacy policy**: new "Photos You Upload" section (needs Matt's review).
- Backend (Strat84/storybloom-backend): stateless illustration pipeline. No more title text leaking onto random pages, no borders, consistent characters from reference sheets, about 4× faster pictures. Plus cast/photo support, dedication on page 1, free-story refund on failure.

### Front end rebuilt on the live backend, plus SEO foundations (P0-3, P1-1, groundwork for P0-6/P0-7/P0-8)

The production front-end source was never pushed to GitHub. This branch rebuilds it from the newest repo code, wired to the existing live backend (same Cognito user pool, same API Gateway endpoints, same Stripe and Lulu request payloads), so sign-in, checkout and print ordering keep working unchanged.

- **One config file** (`storybloom.config.ts`) for prices, shipping, holiday cutoff dates, feature flags and tracking IDs. Current live prices are unchanged; the proposed P0-5 prices are in the file behind `useProposedPricing: false`.
- **Guided creation wizard** at `/create`: child's name, age and pronouns → their look → story theme → art style → extra touches (favorite animal, toy, hobby, dedication, author name, length) → create. Answers survive the sign-up round trip. The free-form prompt is kept as "Advanced: write your own story" at `/create/custom`.
- **7 structured story templates**: Saves Christmas, Night at the North Pole, Lost Reindeer, First Hanukkah Lights, Birthday Adventure, Space Explorer, Big Brother/Sister. Each has a fixed plot outline, illustration guidance and the child's name in the title.
- **Holiday shipping banner** driven by `printCutoffDate` / `expressCutoffDate`, with a countdown in the final week, an express-only phase, and an "instant gift" phase. Print checkout shows estimated delivery dates and a "may not arrive by December 25" warning after the cutoffs. **Currently off:** both dates are `null` until confirmed with Lulu, which hides the banner, countdown, cutoff FAQ and warnings. Holiday stories are still featured (`holiday.seasonActive`).
- **Prerendered pages** (22) with unique titles, descriptions, canonical URLs, Open Graph/Twitter share images, and structured data (Organization, WebSite, Product with real offers, BreadcrumbList, FAQPage, Book). No review/rating markup.
- **Landing pages**: `/christmas-book-for-kids`, `/hanukkah-book-for-kids`, `/personalized-birthday-book`, `/new-sibling-book`, `/gift-for-grandchild`, `/personalized-space-book`. `/personalized-book-with-childs-photo` is built but hidden until `features.photoUpload` is on.
- **Example books** prerendered at `/examples/<slug>` with full story text, from a snapshot of the public examples API (`npm run fetch:examples`).
- `sitemap.xml`, `robots.txt`, a real 404 page, and Amplify routing rules for clean URLs (`scripts/amplify-rules.mjs`).
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
