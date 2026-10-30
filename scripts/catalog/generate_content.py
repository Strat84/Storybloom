"""Write each catalog book's story template and page copy with Claude, validate it, save it.

Usage (outreach venv has the SDK; the key comes from storybloom-outreach/.env):
  python scripts/catalog/generate_content.py --priority P0        # or --slugs a,b,c  [--force]

Output: client/src/content/books/<slug>.json. Cost goes to research/cost_log.csv.
"""

import argparse
import concurrent.futures as cf
import csv
import datetime
import json
import os
import pathlib
import sys

import anthropic

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from validate import ROOT, check_book, example_for, load_seed  # noqa: E402

OUT = ROOT / "client/src/content/books"
MODEL = "claude-opus-5-5"
PRICE_IN, PRICE_OUT, PRICE_CACHE_READ = 4 / 1e6, 20 / 1e6, 0.2 / 1e6

SYSTEM = """You write story templates and shop-page copy for StoryBloom (storybloom.ai), which makes personalized children's picture books. A parent adds their child's name and photo; the child becomes the illustrated hero and every book is created fresh for that child.

STORY RULES
- Exactly 10 story beats, one per page, forming a real arc: beginning, a challenge, the child's own action, a resolution. Never a list of compliments.
- The child is active: they solve the problem and make the choice.
- Beats are written in third person as instructions for a story writer. Use the child's name 1-2 times in each beat.
- Tokens: {name} is the child's name. Gendered words are written as {feminine/masculine} pairs: {she/he}, {She/He}, {her/him}, {her/his}, {daughter/son}. Never write a bare she, he, her, him or his about the child; other characters may use ordinary pronouns.
- Text must work for a child of either gender. Family members other than the child may be named by role (Grandma, Dad).
- Text suits the age range. For babies and toddlers: rhythm, repetition, very few words.
- Original work only. Do not imitate any existing book's title, plot or famous lines.
- No licensed or trademarked characters, no competitor brand names. No real people.
- Family-friendly, wholesome, everyday content. No romance or LGBT themes; families appear as a mom and a dad, a single parent, or grandparents, by role, without commentary.
- Holiday and faith books are accurate and respectful of the tradition.
- Sensitive books (sensitive = true): use plain words. Say "died", never "went to sleep" or "passed away". Make no medical or therapeutic claim. The grown-ups note suggests talking with a pediatrician, counselor or the child's care team where relevant.

COPY RULES
- Warm, parent-to-parent, specific. No hype. No "best", "bestselling", "loved by", customer counts, statistics, or claims of educational, clinical or developmental outcomes. No prices or dates. No em dashes.
- All copy must be genuinely specific to THIS book, its plot and its occasion. Never boilerplate about how personalization works: a shared block on the page already covers name, photo, previewing and dedications.
- story_summary: 3-5 sentences, no spoiler of the ending.
- why_parents: 2 short paragraphs on why this topic, occasion or lesson matters at this age.
- for_grownups: 2-3 conversation prompts or tips. Empty only for pure adventure books with no lesson.
- faqs: exactly 3 questions specific to this book, each with a 1-3 sentence answer. Never mention shipping, price, or photo privacy.
- h1 starts with "Personalized" and includes the main keyword's idea. meta_title is under 60 characters including " | StoryBloom". meta_description is under 150 characters and says the book is personalized.
- feed_title: a Google Shopping title under 110 characters, clear about what it is, like "Personalized Dinosaur Book for Kids, Your Child Is the Hero". feed_description: 400-800 characters of plain text, no links, no shipping or price talk, no ALL CAPS.
- Tokens are for the story only (page_outline and sample_pages). All copy fields say "your child" and never contain tokens.
- image_alt: describes the cover, e.g. "Personalized big sister book cover featuring an illustrated child as the hero".

ILLUSTRATION RULES
- illustration_guide: setting, palette and recurring visual elements, for every page.
- Scene prompts describe the picture only and refer to the child as "the child". They contain no words, signs or lettering.
- cover_scene: the child as hero in the book's world, composed with calm open sky or background across the top third of the picture where a title will be added.
- sample_pages: pick 2 beats from different parts of the story (not the ending). "text" is the finished page text a reader would see, using the tokens, at the right reading level; "scene" is its picture."""

SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": [
        "tagline", "lesson_or_purpose", "tone", "reading_level", "keywords", "illustration_guide", "page_outline", "cover_scene",
        "sample_pages", "h1", "meta_title", "meta_description", "promise", "story_summary", "why_parents", "for_grownups", "faqs",
        "image_alt", "feed_title", "feed_description",
    ],
    "properties": {
        "tagline": {"type": "string"},
        "lesson_or_purpose": {"type": "string"},
        "tone": {"type": "string"},
        "reading_level": {"type": "string"},
        "keywords": {"type": "array", "items": {"type": "string"}},
        "illustration_guide": {"type": "string"},
        "page_outline": {
            "type": "array",
            "items": {
                "type": "object", "additionalProperties": False, "required": ["beat", "illustration_prompt"],
                "properties": {"beat": {"type": "string"}, "illustration_prompt": {"type": "string"}},
            },
        },
        "cover_scene": {"type": "string"},
        "sample_pages": {
            "type": "array",
            "items": {
                "type": "object", "additionalProperties": False, "required": ["text", "scene"],
                "properties": {"text": {"type": "string"}, "scene": {"type": "string"}},
            },
        },
        "h1": {"type": "string"},
        "meta_title": {"type": "string"},
        "meta_description": {"type": "string"},
        "promise": {"type": "string"},
        "story_summary": {"type": "string"},
        "why_parents": {"type": "array", "items": {"type": "string"}},
        "for_grownups": {"type": "array", "items": {"type": "string"}},
        "faqs": {
            "type": "array",
            "items": {
                "type": "object", "additionalProperties": False, "required": ["question", "answer"],
                "properties": {"question": {"type": "string"}, "answer": {"type": "string"}},
            },
        },
        "image_alt": {"type": "string"},
        "feed_title": {"type": "string"},
        "feed_description": {"type": "string"},
    },
}


def api_key():
    for line in (ROOT.parent / "storybloom-outreach/.env").read_text(encoding="utf-8").splitlines():
        if line.startswith("ANTHROPIC_API_KEY="):
            return line.split("=", 1)[1].strip().strip("\"'")
    raise SystemExit("ANTHROPIC_API_KEY not found")


def one_call(client, user):
    resp = client.beta.messages.create(
        model=MODEL,
        max_tokens=16000,
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        system=[{"type": "text", "text": SYSTEM, "cache_control": {"type": "ephemeral"}}],
        output_config={"effort": "medium", "format": {"type": "json_schema", "schema": SCHEMA}},
        messages=[{"role": "user", "content": user}],
    )
    u = resp.usage
    cost = ((u.input_tokens + (u.cache_creation_input_tokens or 0) * 1.25) * PRICE_IN
            + (u.cache_read_input_tokens or 0) * PRICE_CACHE_READ + u.output_tokens * PRICE_OUT)
    if resp.stop_reason in ("refusal", "max_tokens"):
        raise RuntimeError(f"stopped: {resp.stop_reason}")
    text = "".join(b.text for b in resp.content if b.type == "text")
    return json.loads(text), cost


AUDIT_SCHEMA = {
    "type": "object", "additionalProperties": False, "required": ["problems"],
    "properties": {"problems": {"type": "array", "items": {"type": "string"}}},
}


def pronoun_audit(client, book):
    """Claude reads the story: other characters may use ordinary pronouns, so a pattern can't tell them apart."""
    story = [x["beat"] for x in book["page_outline"]] + [x["text"] for x in book["sample_pages"]]
    user = ("This children's story template works for a girl or a boy. {name} is the child. Pronouns about the child must be written as "
            "{she/he}, {her/him} or {her/his} pairs. Ordinary she/he/her/him/his about other characters (Grandma, a dragon, a friend) are correct.\n\n"
            "List each place where a plain she, he, her, him, his, girl, boy, son or daughter refers to the child, quoting the phrase. "
            "An empty list if there are none.\n\n" + "\n".join(story))
    resp = client.messages.create(
        model=MODEL, max_tokens=4000, output_config={"effort": "low", "format": {"type": "json_schema", "schema": AUDIT_SCHEMA}},
        messages=[{"role": "user", "content": user}],
    )
    u = resp.usage
    cost = u.input_tokens * PRICE_IN + u.output_tokens * PRICE_OUT
    return [f"bare pronoun about the child; use a pair token: {x}" for x in json.loads("".join(b.text for b in resp.content if b.type == "text"))["problems"]], cost


def generate(client, seed):
    user = (
        f"Book: {seed['title_pattern']}\nHub: {seed['hub']}\nAges: {seed['age_range']}\nMain search phrase: {seed['main_keyword']}\n"
        f"Peak season: {seed['seasonal_peak'] or 'evergreen'}\nsensitive: {seed['sensitive'] == 'yes'}\nPremise: {seed['premise']}\n\n"
        "Write the template and page copy."
    )
    total, problems = 0.0, []
    for _ in range(3):
        prompt = user + ("\n\nYour last attempt failed these checks. Fix every one:\n- " + "\n- ".join(problems) if problems else "")
        data, cost = one_call(client, prompt)
        total += cost
        book = {
            "slug": seed["slug"], "status": "live", "title_pattern": seed["title_pattern"], "category": seed["hub"],
            "age_range": seed["age_range"], "page_count": 10, "priority": seed["priority"], "seasonal_peak": seed["seasonal_peak"] or None,
            "sensitive": seed["sensitive"] == "yes", "main_keyword": seed["main_keyword"], "landing_page_slug": f"books/{seed['slug']}",
            "example": example_for(seed), **data,
        }
        problems = check_book(book)
        if not problems:
            problems, cost = pronoun_audit(client, book)
            total += cost
        if not problems:
            return book, total, []
    return book, total, problems


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--priority")
    ap.add_argument("--slugs")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()
    seeds = load_seed()
    if a.slugs:
        want = set(a.slugs.split(","))
        seeds = [s for s in seeds if s["slug"] in want]
    elif a.priority:
        seeds = [s for s in seeds if s["priority"] == a.priority]
    OUT.mkdir(parents=True, exist_ok=True)
    seeds = [s for s in seeds if a.force or not (OUT / f"{s['slug']}.json").exists()]
    client = anthropic.Anthropic(api_key=api_key(), max_retries=4)
    spent, failed = 0.0, []

    def run(s):
        return s, *generate(client, s)

    with cf.ThreadPoolExecutor(max_workers=6) as ex:
        for fut in cf.as_completed([ex.submit(run, s) for s in seeds]):
            try:
                s, book, cost, problems = fut.result()
            except Exception as e:  # one bad book shouldn't stop the batch
                print("ERROR", type(e).__name__, str(e)[:200])
                continue
            spent += cost
            with open(ROOT / "research/cost_log.csv", "a", newline="", encoding="utf-8") as f:
                csv.writer(f).writerow([datetime.datetime.now().isoformat(timespec="seconds"), "content", s["slug"], f"{cost:.4f}"])
            if problems:
                failed.append(s["slug"])
                print("FAILED", s["slug"], problems[:4])
            else:
                (OUT / f"{s['slug']}.json").write_text(json.dumps(book, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
                print("ok", s["slug"], f"${cost:.3f}")
    print(f"{len(seeds) - len(failed)} written, {len(failed)} failed, ${spent:.2f}")


if __name__ == "__main__":
    os.chdir(ROOT)
    main()
