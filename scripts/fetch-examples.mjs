// Snapshot the public example books from the live API so they can be prerendered.
//
// Example images are private S3 objects served through 1-hour presigned URLs, so they
// can't be linked from static pages. This downloads each page once, converts it to a
// small WebP under client/public/samples/, and writes the story text and image paths
// to client/src/content/examples.generated.json.
//
// Usage: npm run fetch:examples   (re-run whenever the examples change)

import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const API = "https://cjnwxolfm2.execute-api.us-east-1.amazonaws.com/prod";
const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_IMAGES = path.join(ROOT, "client/public/samples");
const OUT_JSON = path.join(ROOT, "client/src/content/examples.generated.json");
const PAGE_WIDTH = 768;

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function getJson(url) {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" } });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

function orderPages(pages) {
  const front = pages.filter((p) => p.type === "COVER_FRONT");
  const back = pages.filter((p) => p.type === "COVER_BACK");
  const inner = pages.filter((p) => p.type !== "COVER_FRONT" && p.type !== "COVER_BACK");
  return [...front, ...inner, ...back];
}

async function saveImage(url, file) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`image ${res.status}`);
  const input = Buffer.from(await res.arrayBuffer());
  const { data, info } = await sharp(input)
    .resize({ width: PAGE_WIDTH, withoutEnlargement: true })
    .webp({ quality: 74 })
    .toBuffer({ resolveWithObject: true });
  await writeFile(file, data);
  return { width: info.width, height: info.height };
}

const list = await getJson(`${API}/stories/examples/list`);
const items = Array.isArray(list?.examples) ? list.examples : Array.isArray(list?.stories) ? list.stories : Array.isArray(list) ? list : [];

await rm(OUT_IMAGES, { recursive: true, force: true });
const books = [];

for (const item of items) {
  const id = item.storyId || item.id;
  const detail = await getJson(`${API}/stories/examples/${id}`);
  const title = detail.title || item.title || "Untitled Story";
  const slug = slugify(title);
  const dir = path.join(OUT_IMAGES, slug);
  await mkdir(dir, { recursive: true });

  const pages = [];
  for (const [index, page] of orderPages(detail.pages || []).entries()) {
    if (!page.imageUrl) continue;
    const name = `${String(index).padStart(2, "0")}.webp`;
    const size = await saveImage(page.imageUrl, path.join(dir, name));
    pages.push({
      type: page.type || "PAGE",
      text: (page.text || page.content || "").trim(),
      image: `/samples/${slug}/${name}`,
      ...size,
    });
  }

  books.push({
    slug,
    storyId: id,
    title,
    description: (detail.originalPrompt || item.description || "").trim(),
    pages,
  });
  console.log(`${title}: ${pages.length} pages`);
}

await writeFile(OUT_JSON, JSON.stringify(books, null, 2) + "\n");
console.log(`Wrote ${books.length} books to ${path.relative(ROOT, OUT_JSON)}`);
