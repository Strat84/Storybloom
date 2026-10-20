// Serve dist/public locally with the same URL rules as production
// (deploy/cloudfront-url-rewrite.js + the 404 error page).
//
// Usage: node scripts/serve-dist.mjs [port]

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { gzipSync } from "node:zlib";

const root = path.resolve(import.meta.dirname, "..");
const dist = path.join(root, "dist/public");
const port = Number(process.argv[2] ?? 4173);

// Run the real CloudFront function so local behavior matches production.
const fnSource = await readFile(path.join(root, "deploy/cloudfront-url-rewrite.js"), "utf8");
const sandbox = {};
vm.runInNewContext(`${fnSource}\nthis.handler = handler;`, sandbox);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".xml": "application/xml",
  ".txt": "text/plain",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  const querystring = Object.fromEntries([...url.searchParams].map(([k, v]) => [k, { value: v }]));
  const result = sandbox.handler({ request: { uri: decodeURIComponent(url.pathname), querystring } });

  if (result.statusCode) {
    res.writeHead(result.statusCode, { location: result.headers.location.value });
    return res.end();
  }

  const file = path.join(dist, result.uri);
  try {
    if (!file.startsWith(dist) || !(await stat(file)).isFile()) throw new Error("not found");
    const type = TYPES[path.extname(file)] ?? "application/octet-stream";
    const body = await readFile(file);
    // Compress text like CloudFront does, so local performance tests are realistic.
    if (/text|javascript|json|xml|svg/.test(type) && /gzip/.test(req.headers["accept-encoding"] ?? "")) {
      res.writeHead(200, { "content-type": type, "content-encoding": "gzip", "cache-control": "public, max-age=31536000" });
      return res.end(gzipSync(body));
    }
    res.writeHead(200, { "content-type": type, "cache-control": "public, max-age=31536000" });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": TYPES[".html"] });
    res.end(await readFile(path.join(dist, "404.html")));
  }
}).listen(port, () => console.log(`Serving dist/public on http://localhost:${port}`));
