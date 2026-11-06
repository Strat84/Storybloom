// Add example books straight from the dev backend (DynamoDB + S3), for books made by script rather than
// through the staging site. Same output as fetch-examples.mjs: WebP pages under client/public/samples/<slug>/
// and an entry in client/src/content/examples.generated.json (books from other sources are kept).
//
// Usage (needs the `storybloom` AWS CLI profile):
//   node scripts/import-dev-examples.mjs
// Books to import are listed in scripts/dev-example-sources.json ({storyId, title, story, style, starring, description,
// optional trimPages: [page indexes whose plain margin should be cut off]}).

import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

const AWS = process.env.AWS_CLI || "C:\\Program Files\\Amazon\\AWSCLIV2\\aws.exe";
const AWS_ARGS = ["--profile", "storybloom", "--region", "us-east-1"];
const TABLE = "storybloom-dev-stories";
const BUCKET = "storybloom-dev-story-assets";
const ROOT = path.resolve(import.meta.dirname, "..");
const SOURCES = path.join(ROOT, "scripts/dev-example-sources.json");
const OUT_IMAGES = path.join(ROOT, "client/public/samples");
const OUT_JSON = path.join(ROOT, "client/src/content/examples.generated.json");
const PAGE_WIDTH = 768;

const aws = (...args) => execFileSync(AWS, [...AWS_ARGS, ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const plain = (v) => { const [[t, x]] = Object.entries(v); return t === "N" ? Number(x) : t === "M" ? Object.fromEntries(Object.entries(x).map(([k, y]) => [k, plain(y)])) : x; };

function slugify(text) {
  return text.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

function pagesOf(storyId) {
  const out = JSON.parse(aws("dynamodb", "query", "--table-name", TABLE, "--key-condition-expression", "pk = :p AND begins_with(sk, :s)",
    "--expression-attribute-values", JSON.stringify({ ":p": { S: `story#${storyId}` }, ":s": { S: "page#" } }), "--output", "json"));
  const items = out.Items.map((it) => Object.fromEntries(Object.entries(it).map(([k, v]) => [k, plain(v)])));
  const no = (p) => p.pageNo ?? p.pageNumber ?? Number(String(p.sk).split("#")[1]);
  const front = items.filter((p) => p.type === "COVER_FRONT");
  const back = items.filter((p) => p.type === "COVER_BACK");
  const inner = items.filter((p) => p.type !== "COVER_FRONT" && p.type !== "COVER_BACK").sort((a, b) => no(a) - no(b));
  return [...front, ...inner, ...back];
}

const sources = JSON.parse(await readFile(SOURCES, "utf8"));
const existing = JSON.parse(await readFile(OUT_JSON, "utf8"));
const tmp = await mkdtemp(path.join(os.tmpdir(), "sb-examples-"));
const added = [];

for (const source of sources) {
  const slug = slugify(source.title);
  const dir = path.join(OUT_IMAGES, slug);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  const pages = [];
  for (const [index, page] of pagesOf(source.storyId).entries()) {
    if (!page.imageKey) continue;
    const local = path.join(tmp, `${slug}-${index}`);
    aws("s3", "cp", `s3://${BUCKET}/${page.imageKey}`, local, "--only-show-errors");
    const name = `${String(index).padStart(2, "0")}.webp`;
    // A few pictures come back with a plain margin around the art; list them in trimPages to cut it off.
    const src = source.trimPages?.includes(index) ? await sharp(local).trim({ background: "#ffffff", threshold: 30 }).toBuffer() : local;
    const { info } = await sharp(src).resize({ width: PAGE_WIDTH, withoutEnlargement: true }).webp({ quality: 74 })
      .toFile(path.join(dir, name)).then((info) => ({ info }));
    let text = String(page.text || page.content || "").trim();
    let dedication;
    if (pages.length === 1 && text.includes("\n\n")) {
      [dedication, text] = [text.slice(0, text.indexOf("\n\n")).trim(), text.slice(text.indexOf("\n\n")).trim()];
    }
    pages.push({ type: page.type || "PAGE", text, ...(dedication ? { dedication } : {}), image: `/samples/${slug}/${name}`, width: info.width, height: info.height });
  }
  added.push({ slug, storyId: source.storyId, title: source.title, description: source.description, story: source.story,
    style: source.style, starring: source.starring, pages });
  console.log(`${source.title}: ${pages.length} pages`);
}

const books = [...existing.filter((b) => !added.some((a) => a.slug === b.slug)), ...added];
await writeFile(OUT_JSON, JSON.stringify(books, null, 2) + "\n");
await rm(tmp, { recursive: true, force: true });
console.log(`examples.generated.json now has ${books.length} books`);
