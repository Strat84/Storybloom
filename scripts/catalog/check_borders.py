"""List catalog images with a plain white or black band or frame along an edge (the art should run edge to edge).

  python scripts/catalog/check_borders.py
"""

import pathlib

from PIL import Image, ImageStat

ROOT = pathlib.Path(__file__).resolve().parents[2] / "client/public/images/books"


def plain(strip):
    """Nearly one color, and that color is near white or near black."""
    st = ImageStat.Stat(strip.convert("L"))
    return (st.stddev[0] < 9 and st.mean[0] > 235) or (st.stddev[0] < 5 and st.mean[0] < 12)


flagged = {}
for d in sorted(p for p in ROOT.iterdir() if p.is_dir()):
    for name in ("cover.jpg", "page-1.webp", "page-2.webp"):
        im = Image.open(d / name)
        w, h = im.size
        b = max(4, w // 80)
        edges = {"top": (0, 0, w, b), "bottom": (0, h - b, w, h), "left": (0, 0, b, h), "right": (w - b, 0, w, h)}
        hits = [k for k, box in edges.items() if plain(im.crop(box))]
        # A frame or fade shows on two or more edges; one plain edge is just a pale sky or a wall.
        if len(hits) >= 2:
            flagged.setdefault(d.name, []).append(f"{name}:{'+'.join(hits)}")
for slug, what in flagged.items():
    print(slug, what)
print(",".join(flagged))
