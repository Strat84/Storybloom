# Deploying storybloom.ai

The site is static files in an S3 bucket behind CloudFront. The backend (API Gateway + Lambda, Cognito, Stripe, Lulu) is separate and is **not** changed by deploying this front end.

## 0. Back up the live site first (one time, before the first deploy)

The files currently in the bucket are the only copy of the December 2025 front end. Keep them so you can roll back:

```sh
aws s3 sync s3://<SITE_BUCKET> ./backup-live-$(date +%Y%m%d)
```

Also turn on S3 versioning for the bucket if it isn't already.

## 1. Build

```sh
npm ci
npm run build        # outputs dist/public/
node scripts/serve-dist.mjs   # optional: check it at http://localhost:4173 with production URL rules
```

`npm run fetch:examples` refreshes the example books from the live API, and `npm run images` regenerates optimized images. Run both, then rebuild, when examples change.

## 2. Upload

Hashed assets can be cached forever. HTML must revalidate so new deploys show up.

```sh
# Long-lived, fingerprinted or rarely changing files
aws s3 sync dist/public s3://<SITE_BUCKET> \
  --exclude "*.html" --exclude "sitemap.xml" --exclude "robots.txt" \
  --cache-control "public, max-age=31536000, immutable"

# HTML, sitemap and robots: always revalidate
aws s3 sync dist/public s3://<SITE_BUCKET> \
  --exclude "*" --include "*.html" --include "sitemap.xml" --include "robots.txt" \
  --cache-control "public, max-age=0, must-revalidate"
```

Don't use `--delete` on the first deploy (it would remove the backup-able old files). Old hashed assets are harmless.

## 3. CloudFront (one time)

1. **URL rewrite function.** CloudFront → Functions → Create → runtime `cloudfront-js-2.0`, paste `deploy/cloudfront-url-rewrite.js`, publish, and associate it with the distribution's default behavior as **Viewer request**. It maps `/pricing` to `/pricing/index.html`, sends logged-in app pages to `/app.html`, and 301-redirects trailing slashes.
2. **Error pages.** Distribution → Error pages: change the 403 and 404 responses to path `/404.html` with HTTP response code **404**. (Today they most likely return `/index.html` with 200, which makes every unknown URL look like a duplicate home page to Google.)
3. **Compression.** Behavior → "Compress objects automatically": Yes.
4. Invalidate after each deploy: `aws cloudfront create-invalidation --distribution-id <ID> --paths "/*"`.

## 4. Check after deploy

- Open `/`, `/christmas-book-for-kids`, `/pricing`, `/mystories` (should ask you to sign in), and a made-up URL (should show "Page not found").
- Sign in with an existing account and check My Stories, preview, and the print order form up to the Stripe page.
- Run one test purchase end to end before marketing launches.
- `https://storybloom.ai/sitemap.xml` and `/robots.txt` load.
- PageSpeed Insights (mobile) for `/` and `/christmas-book-for-kids`.

## 5. Google Search Console (one time)

1. Add the domain property `storybloom.ai` and verify it with the DNS TXT record Google gives you.
2. Sitemaps → submit `https://storybloom.ai/sitemap.xml`.
3. URL inspection → "Request indexing" for `/`, `/christmas-book-for-kids` and the other landing pages.

## Rollback

```sh
aws s3 sync ./backup-live-YYYYMMDD s3://<SITE_BUCKET>
aws cloudfront create-invalidation --distribution-id <ID> --paths "/*"
```

If you added the URL-rewrite function, detach it from the behavior when rolling back to the old single-page app.
