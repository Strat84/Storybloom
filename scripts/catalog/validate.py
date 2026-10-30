"""Checks for catalog books. Run directly to check every saved book and the overlap between pages:

  python scripts/catalog/validate.py
"""

import csv
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[2]
BOOKS = ROOT / "client/src/content/books"

COMPETITORS = ["wonderbly", "hooray heroes", "i see me", "lumora", "little hero book", "mematime", "lost my name"]
LICENSED = ["disney", "bluey", "paw patrol", "pokemon", "pokémon", "marvel", "frozen", "peppa", "elsa", "spider-man", "spiderman", "batman", "superman", "barbie",
            "star wars", "harry potter", "dr. seuss", "grinch", "rudolph", "goodnight moon", "the very hungry", "little mermaid", "ariel"]
EXCLUDED = ["two moms", "two dads", "two mommies", "two daddies", "lgbt", "gay", "lesbian", "transgender", "same-sex", "queer", "nonbinary", "non-binary"]
HYPE = ["bestselling", "best-selling", "best book", "best gift", "loved by", "thousands of", "millions of", "award-winning", "guaranteed", "clinically",
        "proven", "research shows", "studies show", "cures", "heal", "therapy for", "therapeutic", "treats anxiety", "boosts", "improves reading", "improve reading"]
BOILERPLATE = ["preview", "dedication", "photo", "shipping", "price", "$"]
PAIR = re.compile(r"\{([^{}/]+)/([^{}/]+)\}")
EXAMPLES = [
    ("Maya", "she", "warm brown skin, curly black hair in two puffs"), ("Leo", "he", "light skin, messy sandy-blond hair, freckles"),
    ("Amara", "she", "deep brown skin, short coily black hair"), ("Mateo", "he", "tan skin, wavy dark brown hair"),
    ("Hana", "she", "light tan skin, straight black hair with bangs"), ("Elijah", "he", "dark brown skin, short black curls, round glasses"),
    ("Sophie", "she", "fair skin, long red hair in a braid"), ("Arjun", "he", "medium brown skin, neat black hair"),
    ("Lucia", "she", "olive skin, long wavy brown hair, red glasses"), ("Theo", "he", "light skin, curly auburn hair, uses a wheelchair"),
    ("Zoe", "she", "medium brown skin, big curly brown hair, hearing aids"), ("Kai", "he", "light tan skin, straight dark hair, gap-toothed smile"),
    ("Nora", "she", "fair skin, short blond bob"), ("Malik", "he", "deep brown skin, short fade haircut"),
    ("Isla", "she", "pale skin, straight dark brown hair, freckles"), ("Diego", "he", "tan skin, thick black hair"),
]
# Holiday and faith books get a name from that tradition.
NAME_OVERRIDES = {
    "eight-nights-of-light": ("Noa", "she", "light olive skin, curly dark brown hair"),
    "seven-candles": ("Imani", "she", "deep brown skin, black braids with beads"),
    "festival-of-lights": ("Priya", "she", "medium brown skin, long black braid"),
    "eid-morning": ("Yusuf", "he", "medium tan skin, short dark curly hair"),
    "red-lantern": ("Mei", "she", "light skin, straight black hair in two buns"),
    "reads-from-the-torah": ("Eli", "he", "light olive skin, curly dark hair"),
}


def load_seed():
    with open(ROOT / "research/catalog.tsv", encoding="utf-8") as f:
        return list(csv.DictReader(f, delimiter="\t"))


def example_for(seed):
    if seed["slug"] in NAME_OVERRIDES:
        n, p, look = NAME_OVERRIDES[seed["slug"]]
    else:
        slugs = [s["slug"] for s in load_seed()]
        n, p, look = EXAMPLES[slugs.index(seed["slug"]) % len(EXAMPLES)]
    return {"name": n, "pronouns": p, "look": look}


def render(text, name, pronouns):
    out = PAIR.sub(lambda m: m.group(1) if pronouns == "she" else m.group(2), text)
    return out.replace("{name}", name)


def all_copy(b):
    parts = [b["tagline"], b["h1"], b["meta_title"], b["meta_description"], b["promise"], b["story_summary"], b["feed_title"], b["feed_description"], b["image_alt"]]
    parts += b["why_parents"] + b["for_grownups"]
    for f in b["faqs"]:
        parts += [f["question"], f["answer"]]
    return parts


def body_copy(b):
    return " ".join([b["story_summary"], b["promise"]] + b["why_parents"] + [f["question"] + " " + f["answer"] for f in b["faqs"]])


def check_book(b):
    p = []
    n = len(b["page_outline"])
    if n != 10:
        p.append(f"page_outline must have exactly 10 beats, got {n}")
    if len(b["sample_pages"]) != 2:
        p.append("sample_pages must have exactly 2 items")
    if len(b["faqs"]) != 3:
        p.append("faqs must have exactly 3 items")
    if not 2 <= len(b["why_parents"]) <= 3:
        p.append("why_parents must have 2 paragraphs")
    if len(b["meta_title"]) >= 60:
        p.append(f"meta_title is {len(b['meta_title'])} characters; must be under 60")
    if not b["meta_title"].endswith("| StoryBloom"):
        p.append('meta_title must end with "| StoryBloom"')
    if len(b["meta_description"]) >= 155:
        p.append(f"meta_description is {len(b['meta_description'])} characters; must be under 155")
    if "personaliz" not in b["meta_description"].lower() or "personaliz" not in b["meta_title"].lower():
        p.append("meta_title and meta_description must both mention personalization")
    for k in ("h1", "meta_title", "meta_description", "promise", "tagline", "story_summary", "feed_title", "feed_description", "image_alt"):
        if "{" in b[k]:
            p.append(f'{k} is shown as-is on the page: no {{name}} or other tokens; say "your child"')
    if not b["h1"].startswith("Personalized"):
        p.append('h1 must start with "Personalized"')
    if len(b["feed_title"]) > 120 or "personalized" not in b["feed_title"].lower():
        p.append("feed_title must be under 120 characters and say Personalized")
    if not 300 <= len(b["feed_description"]) <= 1000:
        p.append(f"feed_description is {len(b['feed_description'])} characters; must be 300-1000")
    if b["sensitive"] and not b["for_grownups"]:
        p.append("sensitive books need for_grownups")

    # The template text must render cleanly for either child.
    story = [x["beat"] for x in b["page_outline"]] + [x["text"] for x in b["sample_pages"]]
    for i, s in enumerate(story):
        if "{name}" not in s and i < n:
            p.append(f"beat {i + 1} never uses {{name}}")
        for who in (("Ava", "she"), ("Sam", "he"), ("Maria-Jose", "she")):
            r = render(s, *who)
            if "{" in r or "}" in r:
                p.append(f"unresolved token in: {s[:80]}")
                break
        # A bare pronoun right after the child's name usually means a missed token.
        if re.search(r"\{name\}[^.?!]{0,40}\b(she|he|her|him|his)\b", s, re.I):
            p.append(f"bare pronoun about the child; use a pair token: {s[:90]}")
    pics = " ".join([x["illustration_prompt"] for x in b["page_outline"]] + [x["scene"] for x in b["sample_pages"]] + [b["cover_scene"]])
    if "{name}" in pics:
        p.append('scene prompts must say "the child", not {name}')

    text = " ".join(all_copy(b) + story + [b["title_pattern"], pics, b["illustration_guide"]]).lower()
    for w in COMPETITORS + LICENSED + EXCLUDED:
        if re.search(r"(?<![a-z])" + re.escape(w) + r"(?![a-z])", text):
            p.append(f'not allowed: "{w}"')
    copy = " ".join(all_copy(b)).lower()
    for w in HYPE:
        if re.search(r"(?<![a-z])" + re.escape(w) + r"(?![a-z])", copy):
            p.append(f'no hype or outcome claims: "{w}"')
    if "—" in copy:
        p.append("no em dashes in copy")
    if re.search(r"\$\d", copy):
        p.append("no prices in copy")
    specific = " ".join([b["story_summary"]] + b["why_parents"] + [f["question"] + " " + f["answer"] for f in b["faqs"]]).lower()
    for w in ("shipping", "$"):
        if w in specific:
            p.append(f'leave "{w}" to the shared page sections')
    if b["sensitive"] and re.search(r"went to sleep|passed away|gone to a better|lost (her|his|their|our) (grandma|grandpa|pet)", " ".join(story).lower()):
        p.append('sensitive books use plain words: say "died"')
    return sorted(set(p))


def shingles(text, k=4):
    w = re.findall(r"[a-z']+", text.lower())
    return {" ".join(w[i:i + k]) for i in range(len(w) - k + 1)}


def overlaps(books, limit=0.30):
    """Pages whose main body copy overlaps another page's by more than the limit (brief §5c)."""
    sets = {b["slug"]: shingles(body_copy(b)) for b in books}
    found = []
    slugs = list(sets)
    for i, a in enumerate(slugs):
        for c in slugs[i + 1:]:
            if sets[a] and sets[c]:
                o = len(sets[a] & sets[c]) / min(len(sets[a]), len(sets[c]))
                if o > limit:
                    found.append((a, c, round(o, 2)))
    return found


if __name__ == "__main__":
    books = [json.loads(f.read_text(encoding="utf-8")) for f in sorted(BOOKS.glob("*.json"))]
    bad = 0
    for b in books:
        probs = check_book(b)
        if probs:
            bad += 1
            print(b["slug"], probs)
    o = overlaps(books)
    print(f"{len(books)} books, {bad} with problems, {len(o)} overlapping pairs {o[:10]}")
    print("max pairwise overlap:", max([x[2] for x in overlaps(books, 0)] or [0]))
    raise SystemExit(1 if bad or o else 0)
