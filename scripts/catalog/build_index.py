"""Write client/src/content/books.index.generated.json: the books that are ready to publish.

A book is ready when its template passes the checks and its cover and sample pages exist.

  python scripts/catalog/build_index.py
"""

import json

from validate import BOOKS, ROOT, check_book, load_seed

IMAGES = ROOT / "client/public/images/books"
FIELDS = ["slug", "title_pattern", "category", "age_range", "tagline", "meta_title", "meta_description", "image_alt", "h1"]

order = {s["slug"]: i for i, s in enumerate(load_seed())}
books = sorted((json.loads(f.read_text(encoding="utf-8")) for f in BOOKS.glob("*.json")), key=lambda b: order.get(b["slug"], 9999))
out, waiting = [], []
for b in books:
    if not all((IMAGES / b["slug"] / n).exists() for n in ("cover.jpg", "cover-480.webp", "page-1.webp", "page-2.webp")):
        waiting.append(b["slug"])
        continue
    problems = check_book(b)
    if problems:
        raise SystemExit(f"{b['slug']}: {problems}")
    out.append({**{k: b[k] for k in FIELDS}, "example": {"name": b["example"]["name"], "pronouns": b["example"]["pronouns"]}})
(ROOT / "client/src/content/books.index.generated.json").write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
print(f"{len(out)} books published, {len(waiting)} waiting for art")
