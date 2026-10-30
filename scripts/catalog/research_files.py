"""Build research/keywords.csv and research/competitor_topics.csv from the autocomplete pull and catalog.tsv."""

import csv
import pathlib
import re
from collections import Counter

R = pathlib.Path(__file__).resolve().parents[2] / "research"
rows = list(csv.DictReader(open(R / "catalog.tsv", encoding="utf-8"), delimiter="\t"))
assert len({r["slug"] for r in rows}) == len(rows), "duplicate slug"
assert all(None not in r and r["premise"] for r in rows), "malformed row"
print(len(rows), Counter(r["priority"] for r in rows), Counter(r["hub"] for r in rows))

STOP = {"book", "books", "personalized", "for", "kids", "child", "children", "s", "with", "the", "a", "of", "about", "custom"}


def toks(s):
    return set(re.findall(r"[a-z]+", s.lower())) - STOP


seen = set()
with open(R / "keywords.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow("keyword,est_monthly_volume,intent_group,proposed_page_slug,seasonality,priority,autocomplete_rank".split(","))
    for a in csv.DictReader(open(R / "autocomplete_raw.csv", encoding="utf-8")):
        k = a["suggestion"].lower()
        if k in seen:
            continue
        seen.add(k)
        t = toks(k)
        score = lambda r: len(t & toks(r["main_keyword"] + " " + r["premise"][:60]))
        best = max(rows, key=score)
        hit = score(best) > 0
        # Volume stays blank until Google Ads Keyword Planner access exists.
        w.writerow([k, "", best["hub"] if hit else "general", best["slug"] if hit else "", best["seasonal_peak"], best["priority"] if hit else "", a["rank"]])
print("keywords", len(seen))

WONDERBLY = "Christmas,Hanukkah,New baby,First year,Birthday,Milestone birthday,Mother's Day,Father's Day,Easter,Baptism,Graduation,Baby shower,Valentine's Day,Family stories,Bedtime,Search-and-find,Sports,Pets,Dinosaurs,Early learning,Imaginative,Empowering,Siblings,Grandparents,Aunties and uncles,New parents"
ISEEME = "New Baby,New Sibling,Birthday,Adoption,Religious,Hanukkah,Christmas,Easter,Halloween,Valentine's Day,Mother's Day,Father's Day,Graduation,Back To School,Twins,Siblings,Grandparents,Aunt & Uncle,Long Distance,Bedtime Stories,Dogs,Cats"
with open(R / "competitor_topics.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow("competitor,topic,category,recipient_or_occasion,age_range,url,notes".split(","))
    for t in WONDERBLY.split(","):
        w.writerow(["Wonderbly", t, "navigation", "", "0-12", "https://www.wonderbly.com/us/personalized-books", "Public category navigation only"])
    for t in ISEEME.split(","):
        w.writerow(["I See Me", t, "navigation", "", "0-8", "https://www.iseeme.com/", "Public category navigation only"])
    w.writerow(["Hooray Heroes", "(not reviewed)", "", "", "", "https://hoorayheroes.com/", "Site returned HTTP 429; left unreviewed rather than retried"])
