# StoryBloom launch to-do

Live since Oct 22, 2026: new prices, watermarked preview, print-first checkout, families, write-your-own story.
Marketing launch: **Nov 2, 2026**. Listed in priority order. **Owner** = who has to do it.

## Before any ads go out (this week)

| # | Task | Why | Owner |
|---|------|-----|-------|
| 1 | **Do one real purchase on the live site.** Make a book, buy the $4.99 PDF with your own card, then order the printed book (should show $30.00). Refund yourself in Stripe afterwards if you like. | The live payment and print path has only been tested in test mode. One real order also lets you see Lulu's print quality before customers do. | Matt (I'll watch the logs) |
| 2 | **Gemini and OpenAI billing.** Turn on auto-reload (or a large prepay) for the Gemini key, and check the OpenAI account has credit and a usage limit set. | If either runs dry, new books fail with no pictures or no story. | Matt |
| 2b | **Separate Google (Gemini) keys for the test and live systems**, each with its own budget alert. Today both use the same key, so testing drains the live site's picture credits (that's what emptied the $20 prepay on Oct 24). | A credit outage stops every customer's book. | Matt creates the key; I switch it |
| 2c | **Stop writing customer emails and names to the server logs** (the picture-redraw function logs the full user record). | Privacy: logs are kept indefinitely and readable by anyone with AWS access. | Me |
| 3 | **Tracking (Meta Pixel, GA4, TikTok) in Google Tag Manager** (container GTM-TL24S7M7). The site already sends `view_content`, `generate_lead`, `sign_up`, `begin_checkout`, `purchase` (with value and an event ID for dedupe). Needs: GA4 tag, Meta Pixel + Conversions API, verify storybloom.ai in Meta Business, mark Purchase as the optimization event, test in Meta Events Manager. | Without it Meta can't optimize ads or report CAC. | Matt gives access; I configure |
| 4 | **Order emails** through Amazon SES (already set up for storybloom.ai, 50,000/day). Turn on Stripe's receipt emails today (Stripe Dashboard → Settings → Emails, no code). Then add: "your book is ready", "your book has shipped" with tracking (from the Lulu webhook) and an abandoned-checkout reminder. | Buyers currently get no confirmation from StoryBloom itself. That drives support tickets and chargebacks. | Matt: Stripe receipts. Me: SES emails |
| 5 | **Privacy policy and Terms review**, especially the new "Photos You Upload" section (children's photos, 30-day deletion, not used for AI training). | Children's data is a legal-risk area. Meta also reviews landing pages. | Matt (lawyer if possible) |
| 6 | **Free-story limits.** Currently 1 story per 15 minutes and 2 per day per account, with no lifetime cap. Decide whether to cap free stories per account (e.g. 3) to control AI spend from ad traffic. | Ad traffic will create many free books. Each costs AI money even if nobody buys. | Matt decides; I change it |
| 7 | **Security cleanup.** Remove contractor IAM users (MuhammadMughees, zain). Remove the contractor's GitHub access and rotate the Stripe and Lulu keys they could see. Disable my access key (…MECFQ) when we're done. Add AWS budget alerts. | The contractor still has keys to production and payments. | Matt (I can list exact clicks) |
| 8 | **Google Search Console.** Verify the domain (DNS TXT in Cloudflare), submit the sitemap, request indexing for the landing pages. | Organic traffic takes weeks to build, so start now. | Matt (5 minutes) |

## Before the holiday push (by mid-November)

| # | Task | Why | Owner |
|---|------|-----|-------|
| 9 | **Holiday ship-by dates.** Confirm Lulu production + shipping times, then set `printCutoffDate` / `expressCutoffDate` in `storybloom.config.ts`. This turns on the countdown banner and "may not arrive by Dec 25" warnings. | Late Christmas deliveries are the biggest refund risk. | Matt confirms dates; I set them |
| 10 | **Check Lulu delivery estimates** shown at checkout (Standard 8–13, Priority 6–9, Expedited 4–6 business days) against real orders. | The estimates are promises to customers. | Matt + me |
| 11 | **Sales tax.** Decide whether to turn on Stripe Tax (about 0.5% per transaction) and register where required. | Physical goods shipped to many states. | Matt / accountant |
| 12 | **Monitoring.** CloudWatch alarms on errors in story generation, checkout and the Stripe webhook, emailed to you. | So a failure is caught in minutes, not from customer emails. | Me |
| 13 | **support@storybloom.ai** is checked daily, and the FAQ covers refunds and reprints. | Ad traffic brings questions. | Matt |
| 14 | **Pixel-based border check** for illustrations. The AI vision check misses thin white margins (seen on an example page). A simple edge-pixel check would catch them before printing. | Printed pages with white margins look like a defect. | Me |

## Later

| # | Task | Owner |
|---|------|-------|
| 15 | Hardcover option at $49.99 (needs a Lulu hardcover product ID and cover template). | Me |
| 16 | Gift certificates / "send as a gift" for last-minute buyers after the shipping cutoffs. | Me |
| 17 | Real customer reviews (collected after delivery). Never fake ones. | Matt + me |
| 18 | Retire the second Amplify app (d337m1fzzqrom6) and the unused dev permission `luluQuoteParams`. | Me |

## Done on Oct 22
- Live backend updated: new prices, PDF credit, extra copies, shipping options, family stories, new illustration pipeline. Rollback copies saved.
- Live website switched from the contractor's repo to `Strat84/Storybloom` (branch `prod`). Pushing to `prod` now redeploys the site.
- New routing rules: prerendered SEO pages, real 404s, permanent storybloom.ai → www redirect, old `/create/custom` link redirected.
- Child photos auto-delete after 30 days on live storage. Live story function allowed to save photos.
