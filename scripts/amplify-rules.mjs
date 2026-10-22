// Print the Amplify Hosting rewrite/redirect rules for the built site as JSON.
//
// Amplify's default behavior 301-redirects /pricing to /pricing/ before serving
// /pricing/index.html. These rules serve every prerendered page at its canonical,
// slash-less URL, send logged-in app routes to the app shell, and return a real 404.
//
// Usage: node scripts/amplify-rules.mjs [--apex-redirect] > rules.json
//   then: aws amplify update-app --app-id <id> --custom-rules file://rules.json

import { readdir, stat } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const dist = path.join(root, "dist/public");

// Keep in sync with APP_SHELL_PREFIXES in client/src/routes.tsx.
const APP_SHELL = ["/generated-story", "/book", "/mystories", "/profile"];

async function prerenderedPaths(dir = dist, prefix = "") {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || ["assets", "images", "samples", "fonts", "og"].includes(entry.name)) continue;
    const sub = path.join(dir, entry.name);
    const urlPath = `${prefix}/${entry.name}`;
    try {
      if ((await stat(path.join(sub, "index.html"))).isFile()) found.push(urlPath);
    } catch {
      // Directory without a page.
    }
    found.push(...(await prerenderedPaths(sub, urlPath)));
  }
  return found.sort();
}

const rules = [];
if (process.argv.includes("--apex-redirect")) {
  rules.push({ source: "https://storybloom.ai", target: "https://www.storybloom.ai", status: "301" });
}
// Retired URLs that may still be bookmarked or linked from old ads.
for (const p of ["/create/custom", "/create/custom/"]) {
  rules.push({ source: p, target: "/create?mode=custom", status: "301" });
}
for (const prefix of APP_SHELL) {
  rules.push({ source: prefix, target: "/app.html", status: "200" });
  rules.push({ source: `${prefix}/<*>`, target: "/app.html", status: "200" });
}
for (const p of await prerenderedPaths()) {
  rules.push({ source: `${p}/`, target: p, status: "301" });
  rules.push({ source: p, target: `${p}/index.html`, status: "200" });
}
rules.push({ source: "/<*>", target: "/404.html", status: "404-200" });

process.stdout.write(JSON.stringify(rules, null, 2) + "\n");
