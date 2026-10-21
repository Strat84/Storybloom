# Deploying storybloom.ai

## Where things run

| Piece | Where | Notes |
|---|---|---|
| Live website | AWS Amplify app `d1xdvaub8jmiw5` ("StoryMagic-Client"), branch `prod` | Serves `www.storybloom.ai` (apex redirects to www). DNS is at Cloudflare. |
| Staging website | AWS Amplify app `d355wgiri735ra` ("storybloom-staging"), branch `staging` | https://staging.d355wgiri735ra.amplifyapp.com. Uses the **dev** backend: Stripe test mode, Lulu sandbox. Manual deploys. |
| Backend | Serverless stacks `storybloom-prod` / `storybloom-dev` in us-east-1 | Source: github.com/Strat84/storybloom-backend |
| Secrets | SSM Parameter Store `/storybloom/{dev,prod}/*` | Never in code or git. |

All in AWS account 777380868813.

## Deploy to staging (safe, any time)

```sh
# Build against the dev backend, without analytics, blocked from search engines
SITE_ENV=staging \
VITE_API_BASE_URL=https://keigr6djr2.execute-api.us-east-1.amazonaws.com/dev \
VITE_USER_POOL_ID=us-east-1_v4wLL7iJI \
VITE_USER_POOL_CLIENT_ID=5jrss1relgvpaggkgs1todqnfq \
npm run build

cd dist/public && zip -r ../staging.zip . && cd ../..
aws amplify create-deployment --app-id d355wgiri735ra --branch-name staging   # returns jobId + zipUploadUrl
curl -T dist/staging.zip "<zipUploadUrl>"
aws amplify start-deployment --app-id d355wgiri735ra --branch-name staging --job-id <jobId>

# Routing rules (re-run when pages are added or removed)
node scripts/amplify-rules.mjs > rules.json
aws amplify update-app --app-id d355wgiri735ra --custom-rules file://rules.json
```

Test card: `4242 4242 4242 4242`, any future expiry, any CVC.

## Deploy to production

The live Amplify app builds automatically from git using `amplify.yml` (Node 22, `npm ci`, `npm run build`, publishes `dist/public`).

**One-time switch** (planned, needs Matt's go-ahead): reconnect app `d1xdvaub8jmiw5` from the contractor's repo `Moheed789/StoryMagic-Client` to `Strat84/Storybloom`, and replace its routing rules:

```sh
node scripts/amplify-rules.mjs --apex-redirect > rules-prod.json   # run after a production build
aws amplify update-app --app-id d1xdvaub8jmiw5 --custom-rules file://rules-prod.json
```

The current production rules are a single-page-app catch-all (`/<anything without a dot>` → `/index.html`) plus a 302 apex → www redirect. The new rules serve the prerendered pages, send app pages to `/app.html`, return real 404s, and make the apex redirect a permanent 301.

**Rollback:** in the Amplify console, open the app → the `prod` branch → Deployments → pick the previous deployment → **Redeploy this version**. To undo the repo switch, reconnect the app to the old repository.

## After every production deploy

- Open `/`, `/christmas-book-for-kids`, `/pricing`, `/mystories` (should ask you to sign in) and a made-up URL (should show "Page not found").
- Sign in with a real account and check My Stories and the print order form up to the Stripe page.
- `https://www.storybloom.ai/sitemap.xml` and `/robots.txt` load.
- PageSpeed Insights (mobile) for `/` and `/christmas-book-for-kids`.

## Google Search Console (one time)

1. Add the domain property `storybloom.ai` and verify it with the DNS TXT record Google gives you (add it in Cloudflare).
2. Sitemaps → submit `https://www.storybloom.ai/sitemap.xml`.
3. URL inspection → "Request indexing" for `/` and each landing page.
