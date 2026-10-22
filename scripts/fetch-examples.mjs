// Snapshot the example books listed in scripts/example-sources.json so they can be prerendered.
//
// The examples are real books made with the StoryBloom wizard (on the staging site, with
// a QA account). Story images are private S3 objects served through 1-hour presigned URLs,
// so they can't be linked from static pages. This downloads each page once, converts it
// to a small WebP under client/public/samples/, and writes the story text and image paths
// to client/src/content/examples.generated.json.
//
// Usage:
//   STORYBLOOM_ID_TOKEN=<Cognito ID token of the account that owns the books> npm run fetch:examples
//   STORYBLOOM_API defaults to the dev API (where the staging site's books live).

import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const API = process.env.STORYBLOOM_API || "https://keigr6djr2.execute-api.us-east-1.amazonaws.com/dev";
const TOKEN = process.env.STORYBLOOM_ID_TOKEN;
const ROOT = path.resolve(import.meta.dirname, "..");
const SOURCES = path.join(ROOT, "scripts/example-sources.json");
const OUT_IMAGES = path.join(ROOT, "client/public/samples");
const OUT_JSON = path.join(ROOT, "client/src/content/examples.generated.json");
const PAGE_WIDTH = 768;

if (!TOKEN) {
  console.error("Set STORYBLOOM_ID_TOKEN to the ID token of the account that owns the example books.");
  process.exit(1);
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function getJson(url) {
  const res = await fetch(url, { headers: { Authorization: TOKEN, "Content-Type": "application/json" } });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

function orderPages(pages) {
  const front = pages.filter((p) => p.type === "COVER_FRONT");
  const back = pages.filter((p) => p.type === "COVER_BACK");
  const inner = pages
    .filter((p) => p.type !== "COVER_FRONT" && p.type !== "COVER_BACK")
    .sort((a, b) => (a.pageNo ?? a.pageNumber ?? 0) - (b.pageNo ?? b.pageNumber ?? 0));
  return [...front, ...inner, ...back];
}

async function saveImage(url, file, trim) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`image ${res.status}`);
  let image = sharp(Buffer.from(await res.arrayBuffer()));
  // A few pictures come back with a plain margin around the art; cut it off.
  if (trim) image = sharp(await image.trim({ threshold: 30 }).toBuffer());
  const { data, info } = await image
    .resize({ width: PAGE_WIDTH, withoutEnlargement: true })
    .webp({ quality: 74 })
    .toBuffer({ resolveWithObject: true });
  await writeFile(file, data);
  return { width: info.width, height: info.height };
}

const sources = JSON.parse(await readFile(SOURCES, "utf8"));
await rm(OUT_IMAGES, { recursive: true, force: true });
const books = [];

for (const source of sources) {
  const detail = await getJson(`${API}/stories/${source.storyId}`);
  const slug = slugify(source.title);
  const dir = path.join(OUT_IMAGES, slug);
  await mkdir(dir, { recursive: true });

  const pages = [];
  for (const [index, page] of orderPages(detail.pages || []).entries()) {
    if (!page.imageUrl) continue;
    const name = `${String(index).padStart(2, "0")}.webp`;
    const size = await saveImage(page.imageUrl, path.join(dir, name), source.trimPages?.includes(index));
    let text = (page.text || page.content || "").trim();
    // The dedication is stored as the first paragraph of page 1.
    let dedication;
    if (pages.length === 1 && text.includes("\n\n")) {
      [dedication, text] = [text.slice(0, text.indexOf("\n\n")).trim(), text.slice(text.indexOf("\n\n")).trim()];
    }
    pages.push({
      type: page.type || "PAGE",
      text,
      ...(dedication ? { dedication } : {}),
      image: `/samples/${slug}/${name}`,
      ...size,
    });
  }

  books.push({
    slug,
    storyId: source.storyId,
    title: source.title,
    description: source.description,
    story: source.story,
    style: source.style,
    starring: source.starring,
    pages,
  });
  console.log(`${source.title}: ${pages.length} pages`);
}

await writeFile(OUT_JSON, JSON.stringify(books, null, 2) + "\n");
console.log(`Wrote ${books.length} books to ${path.relative(ROOT, OUT_JSON)}`);
