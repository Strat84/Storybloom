"""Contact sheet for reviewing catalog art by eye: python scripts/catalog/contact_sheet.py out.png slug,slug,... [--covers]"""

import pathlib
import sys

from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parents[2] / "client/public/images/books"
out, slugs = sys.argv[1], sys.argv[2].split(",")
covers_only = "--covers" in sys.argv
names = ["cover.jpg"] if covers_only else ["cover.jpg", "page-1.webp", "page-2.webp"]
W, H = (240, 320) if covers_only else (300, 400)
cols = 6 if covers_only else 3
n = len(slugs) * len(names)
rows = (n + cols - 1) // cols
sheet = Image.new("RGB", (cols * W, rows * (H + 18)), "white")
d = ImageDraw.Draw(sheet)
i = 0
for s in slugs:
    for name in names:
        x, y = (i % cols) * W, (i // cols) * (H + 18)
        sheet.paste(Image.open(ROOT / s / name).convert("RGB").resize((W, H)), (x, y + 18))
        d.text((x + 3, y + 3), f"{s} {name}"[:44], fill="black")
        i += 1
sheet.save(out)
