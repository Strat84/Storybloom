// Serve dist/public locally the way production does: clean URLs (/pricing ->
// /pricing/index.html), app pages -> /app.html, unknown paths -> 404.html.
// Mirrors the Amplify rules from scripts/amplify-rules.mjs.
//
// Usage: node scripts/serve-dist.mjs [port]

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";

const root = path.resolve(import.meta.dirname, "..");
const dist = path.join(root, "dist/public");
const port = Number(process.argv[2] ?? 4173);

// Keep in sync with APP_SHELL_PREFIXES in client/src/routes.tsx.
const APP_SHELL = ["/generated-story", "/book", "/mystories", "/profile"];

function rewrite(uri) {
  if (uri.length > 1 && uri.endsWith("/")) return { redirect: uri.replace(/\/+$/, "") };
  if (/\.[a-zA-Z0-9]+$/.test(uri)) return { uri };
  if (APP_SHELL.some((p) => uri === p || uri.startsWith(`${p}/`))) return { uri: "/app.html" };
  return { uri: uri === "/" ? "/index.html" : `${uri}/index.html` };
}

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
  const result = rewrite(decodeURIComponent(url.pathname));

  if (result.redirect) {
    res.writeHead(301, { location: result.redirect + url.search });
    return res.end();
  }

  const file = path.join(dist, result.uri);
  try {
    if (!file.startsWith(dist) || !(await stat(file)).isFile()) throw new Error("not found");
    const type = TYPES[path.extname(file)] ?? "application/octet-stream";
    const body = await readFile(file);
    // Compress text like Amplify does, so local performance tests are realistic.
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
