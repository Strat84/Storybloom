// Convert the large source PNGs in attached_assets/ to small WebP files in
// client/public/images/, and build the 1200x630 social share image.
//
// Usage: npm run images   (re-run when source images change)

import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "attached_assets");
const OUT = path.join(ROOT, "client/public/images");
const OG_OUT = path.join(ROOT, "client/public/og");

const styleImages = {
  traditional: "Traditional Cartoon_1758733335419.png",
  anime: "anime image_1758732709903.png",
  "3d": "3d animation image_1758733193464.png",
  chibi: "Chibi Image_1758733051980.png",
};

await mkdir(path.join(OUT, "styles"), { recursive: true });
await mkdir(OG_OUT, { recursive: true });

for (const [id, file] of Object.entries(styleImages)) {
  for (const width of [400, 800]) {
    await sharp(path.join(SRC, file))
      .resize({ width, height: Math.round((width * 3) / 4), fit: "cover" })
      .webp({ quality: 72 })
      .toFile(path.join(OUT, "styles", `${id}-${width}.webp`));
  }
}

const hero = path.join(SRC, "generated_images/Magical_children_reading_storybooks_f141e6f5.png");
for (const width of [640, 1024, 1440]) {
  await sharp(hero).resize({ width }).webp({ quality: 70 }).toFile(path.join(OUT, `hero-${width}.webp`));
}

// Share card: hero art on the left two-thirds, brand panel on the right.
const heroArt = await sharp(hero).resize({ width: 760, height: 630, fit: "cover" }).toBuffer();
const panel = Buffer.from(`
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#7c4dee"/>
      <stop offset="1" stop-color="#5b2fc9"/>
    </linearGradient>
  </defs>
  <rect x="760" y="0" width="440" height="630" fill="url(#g)"/>
  <text x="800" y="230" font-family="Arial Rounded MT Bold, Arial, sans-serif" font-size="58" font-weight="700" fill="#ffffff">StoryBloom</text>
  <text x="800" y="310" font-family="Arial, sans-serif" font-size="34" fill="#f3edff">Personalized</text>
  <text x="800" y="355" font-family="Arial, sans-serif" font-size="34" fill="#f3edff">storybooks starring</text>
  <text x="800" y="400" font-family="Arial, sans-serif" font-size="34" fill="#f3edff">your child</text>
  <rect x="800" y="450" width="300" height="64" rx="32" fill="#fbbf24"/>
  <text x="950" y="492" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#3b1f7a">storybloom.ai</text>
</svg>`);
await sharp({ create: { width: 1200, height: 630, channels: 3, background: "#ffffff" } })
  .composite([
    { input: heroArt, left: 0, top: 0 },
    { input: panel, left: 0, top: 0 },
  ])
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile(path.join(OG_OUT, "storybloom-share.jpg"));

// One share card per example book: its cover on the brand background.
const examples = JSON.parse(await readFile(path.join(ROOT, "client/src/content/examples.generated.json"), "utf8"));
await mkdir(path.join(OG_OUT, "examples"), { recursive: true });
for (const book of examples) {
  const cover = book.pages.find((p) => p.type === "COVER_FRONT") ?? book.pages[0];
  if (!cover) continue;
  const coverArt = await sharp(path.join(ROOT, "client/public", cover.image)).resize({ height: 570 }).toBuffer();
  const { width: coverWidth } = await sharp(coverArt).metadata();
  const title = book.title.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const words = title.split(" ");
  const lines = [];
  for (const word of words) {
    const last = lines[lines.length - 1];
    if (last && (last + " " + word).length <= 20) lines[lines.length - 1] = last + " " + word;
    else lines.push(word);
  }
  const textX = 30 + coverWidth + 50;
  const svg = Buffer.from(`
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7c4dee"/><stop offset="1" stop-color="#5b2fc9"/></linearGradient></defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  ${lines.slice(0, 4).map((l, i) => `<text x="${textX}" y="${200 + i * 66}" font-family="Arial Rounded MT Bold, Arial, sans-serif" font-size="56" font-weight="700" fill="#ffffff">${l}</text>`).join("")}
  <text x="${textX}" y="${200 + Math.min(lines.length, 4) * 66 + 30}" font-family="Arial, sans-serif" font-size="30" fill="#f3edff">A personalized StoryBloom book</text>
  <rect x="${textX}" y="500" width="300" height="64" rx="32" fill="#fbbf24"/>
  <text x="${textX + 150}" y="542" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#3b1f7a">storybloom.ai</text>
</svg>`);
  await sharp(svg)
    .composite([{ input: coverArt, left: 30, top: 30 }])
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(path.join(OG_OUT, "examples", `${book.slug}.jpg`));
}

console.log("Images written to client/public/images and client/public/og");
