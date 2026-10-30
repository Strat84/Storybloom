"""Example art for catalog books: the app's image model and house style, the title set in code.

For each book: a character sheet (not published), the cover art, then 2 sample pages drawn from that
sheet. Saved to client/public/images/books/<slug>/ with the IPTC "trainedAlgorithmicMedia" tag that
Google Merchant Center requires on AI images. Cost goes to research/cost_log.csv.

  python scripts/catalog/generate_images.py --priority P0     # or --slugs a,b,c  [--force]
"""

import argparse
import base64
import concurrent.futures as cf
import csv
import datetime
import html
import io
import json
import os
import pathlib
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request

from PIL import Image

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from validate import BOOKS, ROOT, render  # noqa: E402

OUT = ROOT / "client/public/images/books"
FONT = ROOT / "client/public/fonts/fredoka-one-latin.woff2"
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
MODEL = "gemini-2.5-flash-image"
COST_PER_IMAGE = 0.039

# Same wording as storybloom-backend/services/illustration/illustrator.js and the Traditional Cartoon style.
STYLE = ("Style: Classic Western children's cartoon with dynamic action poses, thick black outlines, and saturated primary colors. "
         "Characters have normal eyes with visible pupils and irises (never blank white eyes). Simple, readable shapes with gentle "
         "squash-and-stretch; minimal cel shading. Clear silhouettes, warm playful tone. Image must fill the entire frame edge-to-edge "
         "with no white borders, black bars, or empty spaces on any side.")
WORDLESS = ("This is a wordless picture-book illustration. There is no writing anywhere in the image: no letters, words, numbers, captions, "
            "labels, signs, banners, book covers with words, speech bubbles or page numbers. Any letter, sign or note in the scene is shown "
            "blank or seen from behind.")
SAME_COLORS = "Keep the exact colors described for hair, fur, skin, eyes and clothing. The art style changes how things are drawn, never their colors."
FULL_BLEED = "Fill the whole frame edge to edge with the scene; no borders, frames or empty margins."

XMP = (b'<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?><x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF '
       b'xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about="" '
       b'xmlns:Iptc4xmpExt="http://iptc.org/std/Iptc4xmpExt/2008-02-29/" '
       b'Iptc4xmpExt:DigitalSourceType="http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia"/>'
       b'</rdf:RDF></x:xmpmeta><?xpacket end="w"?>')


def gemini_key():
    for line in (ROOT.parent / "storybloom-outreach/.env").read_text(encoding="utf-8").splitlines():
        if line.startswith("GEMINI_API_KEY="):
            return line.split("=", 1)[1].strip().strip("\"'")
    # The app's own key, the one its image generation uses. Never printed.
    aws = r"C:\Program Files\Amazon\AWSCLIV2\aws.exe"
    out = subprocess.run([aws, "--profile", "storybloom", "ssm", "get-parameter", "--region", "us-east-1", "--name", "/storybloom/prod/GEMINI_API_KEY",
                          "--with-decryption", "--query", "Parameter.Value", "--output", "text"], capture_output=True, text=True, check=True)
    return out.stdout.strip()


def draw(key, parts):
    body = json.dumps({"contents": [{"role": "user", "parts": parts}],
                       "generationConfig": {"responseModalities": ["IMAGE"], "imageConfig": {"aspectRatio": "3:4"}}}).encode()
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"
    last = None
    for attempt in range(5):
        try:
            req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json", "x-goog-api-key": key})
            d = json.load(urllib.request.urlopen(req, timeout=180))
            for p in d["candidates"][0]["content"]["parts"]:
                if "inlineData" in p:
                    return base64.b64decode(p["inlineData"]["data"])
            last = "no image in response"
        except urllib.error.HTTPError as e:
            last = f"HTTP {e.code}"
            if e.code not in (429, 500, 502, 503, 504):
                break
        except Exception as e:
            last = type(e).__name__
        time.sleep(8 * (attempt + 1))
    raise RuntimeError(f"image failed: {last}")


def ref_part(img):
    return {"inlineData": {"mimeType": "image/png", "data": base64.b64encode(img).decode()}}


def typeset_cover(art, title, work):
    """The art with the title on top, rendered by Chrome in the site's display font."""
    (work / "art.png").write_bytes(art)
    page = f"""<!doctype html><meta charset="utf-8"><style>
@font-face{{font-family:T;src:url('{FONT.as_uri()}')}}
html,body{{margin:0;width:900px;height:1200px;overflow:hidden}}
body{{background:url('art.png') center/cover}}
h1{{position:absolute;top:44px;left:50px;right:50px;margin:0;text-align:center;font:400 100px/1.08 T;color:#fff;
-webkit-text-stroke:12px #2a1a5e;paint-order:stroke fill;text-wrap:balance}}
</style><h1 id=t>{html.escape(title)}</h1><script>
document.fonts.ready.then(()=>{{const t=document.getElementById('t');let s=100;
while(t.offsetHeight>330&&s>44){{s-=4;t.style.fontSize=s+'px';t.style.webkitTextStrokeWidth=Math.max(7,s*.12)+'px'}}}});
</script>"""
    f = work / "cover.html"
    f.write_text(page, encoding="utf-8")
    png = work / "cover.png"
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-first-run", "--allow-file-access-from-files", f"--user-data-dir={work / 'prof'}",
                    "--hide-scrollbars", "--window-size=900,1200", "--virtual-time-budget=4000", f"--screenshot={png}", f.as_uri()],
                   capture_output=True, timeout=120, check=False)
    if not png.exists():
        raise RuntimeError("Chrome did not produce the cover")
    return Image.open(png).convert("RGB")


def make(key, b):
    ex = b["example"]
    name = ex["name"]
    low = int(b["age_range"].split("-")[0])
    age = "baby" if low == 0 else f"{max(low + 1, 2)}-year-old child"
    who = f"{name}, a {age}, {ex['look']}"
    names = lambda s: s.replace("The child", name).replace("the child", name)  # noqa: E731
    sheet = draw(key, [{"text": "\n\n".join([
        "Character reference picture for a children's picture book.", STYLE, f"Show only {who}.",
        "Full body, standing, facing the viewer with a friendly expression, on a plain soft white background. Exactly one character.",
        SAME_COLORS, WORDLESS])}])
    refs = [{"text": f"Reference picture of {name}. Draw {name} looking exactly like this."}, ref_part(sheet)]

    def scene(text, framing):
        return draw(key, refs + [{"text": "\n\n".join([STYLE, f"Scene: {names(text)}", f"Setting and palette: {b['illustration_guide']}",
                                                     f"{who}. {SAME_COLORS}", framing, FULL_BLEED])}])

    cover = scene(b["cover_scene"], "This is the front cover of a children's picture book. Keep the top third of the picture calm and uncluttered "
                                    "(sky, wall or soft background, no faces), because the title will be printed there later. " + WORDLESS)
    d = OUT / b["slug"]
    d.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        img = typeset_cover(cover, render(b["title_pattern"], name, ex["pronouns"]), pathlib.Path(tmp))
        img.save(d / "cover.jpg", "JPEG", quality=84, optimize=True, xmp=XMP)
        img.resize((480, 640), Image.LANCZOS).save(d / "cover-480.webp", "WEBP", quality=78, xmp=XMP)
    for i, s in enumerate(b["sample_pages"], 1):
        page = Image.open(io.BytesIO(scene(s["scene"], "This is an inside page of a children's picture book. " + WORDLESS))).convert("RGB")
        page.thumbnail((750, 1000))
        page.save(d / f"page-{i}.webp", "WEBP", quality=78, xmp=XMP)
    return 4 * COST_PER_IMAGE


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--priority")
    ap.add_argument("--slugs")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()
    books = [json.loads(f.read_text(encoding="utf-8")) for f in sorted(BOOKS.glob("*.json"))]
    if a.slugs:
        books = [b for b in books if b["slug"] in set(a.slugs.split(","))]
    elif a.priority:
        books = [b for b in books if b["priority"] == a.priority]
    if not a.force:
        books = [b for b in books if not (OUT / b["slug"] / "page-2.webp").exists()]
    key = gemini_key()
    spent = 0.0

    def run(b):
        return b, make(key, b)

    with cf.ThreadPoolExecutor(max_workers=4) as ex:
        for fut in cf.as_completed([ex.submit(run, b) for b in books]):
            try:
                b, cost = fut.result()
            except Exception as e:
                print("ERROR", str(e)[:160])
                continue
            spent += cost
            with open(ROOT / "research/cost_log.csv", "a", newline="", encoding="utf-8") as f:
                csv.writer(f).writerow([datetime.datetime.now().isoformat(timespec="seconds"), "images", b["slug"], f"{cost:.4f}"])
            print("ok", b["slug"])
    # What each example cover shows, so variety across the catalog can be checked (brief §4).
    with open(ROOT / "research/covers_manifest.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["slug", "example_name", "pronouns", "look"])
        for p in sorted(BOOKS.glob("*.json")):
            b = json.loads(p.read_text(encoding="utf-8"))
            w.writerow([b["slug"], b["example"]["name"], b["example"]["pronouns"], b["example"]["look"]])
    print(f"{len(books)} books attempted, ${spent:.2f}")


if __name__ == "__main__":
    os.chdir(ROOT)
    main()
