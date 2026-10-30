// Render every public page to static HTML so crawlers (and slow phones) get real
// content, unique titles and structured data without running JavaScript.
//
// Outputs into dist/public/:
//   <path>/index.html   one per public page (index.html for the home page)
//   app.html            empty shell for logged-in app routes (noindex)
//   404.html            not-found page (noindex)
//   sitemap.xml, robots.txt

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(import.meta.dirname, "..");
const outDir = path.join(root, "dist/public");
const server = await import(pathToFileURL(path.join(root, "dist/server/entry-server.js")).href);
const { render, renderHead, pageMetaFor, SITEMAP, PRERENDER_ONLY, NOT_FOUND_META, merchantFeedXml } = server;

const SITE_URL = "https://www.storybloom.ai";
let template = await readFile(path.join(outDir, "index.html"), "utf8");
if (!template.includes("<!--app-head-->")) throw new Error("index.html is missing <!--app-head-->");

// Inline the (small) stylesheet so first paint doesn't wait for another request,
// and let the app script download at low priority: the HTML is already complete.
const cssLink = template.match(/<link rel="stylesheet" crossorigin href="(\/assets\/[^"]+\.css)">/);
if (cssLink) {
  const css = await readFile(path.join(outDir, cssLink[1]), "utf8");
  template = template.replace(cssLink[0], () => `<style>${css}</style>`);
}
template = template.replace(/<script type="module" crossorigin src="/, '<script type="module" crossorigin fetchpriority="low" src="');

// Staging builds (SITE_ENV=staging): keep test traffic out of analytics and search results.
const STAGING = process.env.SITE_ENV === "staging";
if (STAGING) {
  template = template
    .replace(/<script>\s*\(function \(w, d, s, l, i\)[\s\S]*?GTM-[A-Z0-9]+"\);\s*<\/script>/, "")
    .replace(/<noscript><iframe src="https:\/\/www\.googletagmanager\.com[\s\S]*?<\/noscript>/, "")
    .replace("<!--app-head-->", '<meta name="robots" content="noindex, nofollow"><!--app-head-->');
  if (template.includes("googletagmanager")) throw new Error("Failed to strip GTM from staging build");
}

function page(head, body, prerenderedPath) {
  const attr = prerenderedPath ? ` data-prerendered="${prerenderedPath}"` : "";
  // Function replacers: page content contains "$" (prices), which string replacements would interpret.
  return template.replace("<!--app-head-->", () => head).replace('<div id="root"></div>', () => `<div id="root"${attr}>${body}</div>`);
}

function fileFor(urlPath) {
  return urlPath === "/" ? path.join(outDir, "index.html") : path.join(outDir, urlPath.slice(1), "index.html");
}

// App shell for client-only routes, written before index.html is replaced.
const shellHead = renderHead({ path: "/app", title: "StoryBloom", description: "Personalized storybooks starring your child.", noindex: true });
await writeFile(path.join(outDir, "app.html"), page(shellHead, "", null));

const paths = [...SITEMAP.map((e) => e.path), ...PRERENDER_ONLY];
for (const urlPath of paths) {
  const html = render(urlPath);
  const file = fileFor(urlPath);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, page(renderHead(pageMetaFor(urlPath)), html, urlPath));
}

await writeFile(path.join(outDir, "404.html"), page(renderHead(NOT_FOUND_META), render("/__not-found__"), "/__not-found__"));

const lastmod = new Date().toISOString().slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${SITEMAP.map(
  (e) => `  <url>
    <loc>${SITE_URL}${e.path === "/" ? "/" : e.path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority.toFixed(1)}</priority>
  </url>`,
).join("\n")}
</urlset>
`;
await writeFile(path.join(outDir, "sitemap.xml"), sitemap);
if (!STAGING) await writeFile(path.join(outDir, "merchant-feed.xml"), merchantFeedXml());

const robots = STAGING ? "User-agent: *\nDisallow: /\n" : `User-agent: *
Allow: /
Disallow: /mystories
Disallow: /profile
Disallow: /generated-story/
Disallow: /book/
Disallow: /app.html

Sitemap: ${SITE_URL}/sitemap.xml
`;
await writeFile(path.join(outDir, "robots.txt"), robots);

console.log(`Prerendered ${paths.length} pages, app.html, 404.html, sitemap.xml (${SITEMAP.length} URLs) and robots.txt`);
