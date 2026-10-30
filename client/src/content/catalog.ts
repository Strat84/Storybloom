/**
 * The book catalog: one topic per file in content/books/, shown at /books and /books/<slug>.
 *
 * Each book is a story template for the same generator and wizard as the themes in themes.ts
 * (bookToTheme below); only the catalog pages are new. scripts/catalog/build_index.py writes
 * books.index.generated.json, the small always-loaded list. A book is listed there only once its
 * cover and sample pages exist. The full files load on demand so the outlines stay out of the main
 * bundle, except while prerendering, which needs them synchronously.
 */

import index from "./books.index.generated.json";
import { PRONOUNS, getTheme, registerTheme, type HeroDetails, type StoryTheme } from "./themes";
import type { Faq } from "./faq";

export interface CatalogEntry {
  slug: string;
  title_pattern: string;
  category: string;
  age_range: string;
  tagline: string;
  meta_title: string;
  meta_description: string;
  image_alt: string;
  h1: string;
  example: { name: string; pronouns: "she" | "he" };
}

export interface CatalogBook extends CatalogEntry {
  sensitive: boolean;
  promise: string;
  story_summary: string;
  why_parents: string[];
  for_grownups: string[];
  faqs: Faq[];
  sample_pages: { text: string; scene: string }[];
  illustration_guide: string;
  page_outline: { beat: string; illustration_prompt: string }[];
  feed_title: string;
  feed_description: string;
}

/** What a book page needs: everything except the story template. */
export type BookPageData = Omit<CatalogBook, "page_outline" | "illustration_guide" | "feed_title" | "feed_description">;

export const CATALOG = index as CatalogEntry[];

export interface Hub {
  slug: string;
  name: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: string;
}

export const HUBS: Hub[] = [
  {
    slug: "christmas",
    name: "Christmas",
    metaTitle: "Personalized Christmas Books for Kids | StoryBloom",
    metaDescription: "Personalized Christmas stories starring your child: Santa's workshop, Christmas Eve magic, a baby's first Christmas and more.",
    h1: "Personalized Christmas books",
    intro: "Christmas stories where your child is the one Santa's helpers call on. Pick a snowy adventure for a big kid, or a soft read-aloud for a baby's very first Christmas morning.",
  },
  {
    slug: "holidays",
    name: "Holidays",
    metaTitle: "Personalized Holiday Books for Kids | StoryBloom",
    metaDescription: "Personalized books for Hanukkah, Easter, Halloween, Thanksgiving, Diwali, Eid, Lunar New Year and more, starring your child.",
    h1: "Personalized books for every holiday",
    intro: "From the eight nights of Hanukkah to an Easter egg trail, these stories put your child in the middle of the days your family looks forward to all year.",
  },
  {
    slug: "birthday",
    name: "Birthdays",
    metaTitle: "Personalized Birthday Books for Kids | StoryBloom",
    metaDescription: "Personalized birthday books for turning one, three, five, ten and every age in between, with your child as the birthday hero.",
    h1: "Personalized birthday books",
    intro: "A birthday present they can keep reading long after the cake is gone. Each story is written for a particular age, so a one-year-old and a ten-year-old each get a book that fits.",
  },
  {
    slug: "new-baby",
    name: "New baby",
    metaTitle: "Personalized New Baby and Big Sibling Books | StoryBloom",
    metaDescription: "Personalized books to welcome a newborn or help an older child become a big sister or brother, starring your own family.",
    h1: "Personalized books for a new baby",
    intro: "A keepsake to welcome a newborn, and honest, reassuring stories for the older child whose whole world is about to shift.",
  },
  {
    slug: "gifts-from-grandparents",
    name: "From grandparents",
    metaTitle: "Personalized Gift Books from Grandparents | StoryBloom",
    metaDescription: "Personalized books from grandma or grandpa to a grandchild, including stories for grandparents who live far away.",
    h1: "Personalized books from grandparents",
    intro: "Stories that read like time spent together: baking with Nana, a day in Grandpa's boat, a letter that arrives from far away. Add your own dedication and it becomes a gift from you.",
  },
  {
    slug: "gifts-from-family",
    name: "From family",
    metaTitle: "Personalized Gift Books from Family | StoryBloom",
    metaDescription: "Personalized books from mom, dad, an aunt, an uncle or a godparent, written around time spent together with your child.",
    h1: "Personalized books from the people who love them",
    intro: "A road trip with Dad, a garden with Mom, a ridiculous afternoon with a favorite aunt or uncle. These are stories about one child and one grown-up who adores them.",
  },
  {
    slug: "milestones",
    name: "Milestones",
    metaTitle: "Personalized Milestone Books for Kids | StoryBloom",
    metaDescription: "Personalized books for first days of school, wiggly teeth, big kid beds, new houses and the other firsts of childhood.",
    h1: "Personalized books for big firsts",
    intro: "First day of school, first lost tooth, first night in a new house. Reading about a big change ahead of time, with their own name in the story, gives a child something to hold on to.",
  },
  {
    slug: "life-lessons",
    name: "Life lessons",
    metaTitle: "Personalized Books on Kindness and Feelings | StoryBloom",
    metaDescription: "Personalized stories about kindness, bravery, big feelings, friendship and everyday habits, with conversation ideas for grown-ups.",
    h1: "Personalized books about growing up",
    intro: "Kindness, bravery, big feelings and everyday habits, shown through a story instead of a lecture. Most include a short note for grown-ups with questions to talk about afterward.",
  },
  {
    slug: "bedtime",
    name: "Bedtime",
    metaTitle: "Personalized Bedtime Books for Kids | StoryBloom",
    metaDescription: "Quiet personalized bedtime stories, and a gentle book for children who are afraid of the dark, with your child as the hero.",
    h1: "Personalized bedtime books",
    intro: "Soft rhythms and slow endings for the last book of the night, including a story for the child who is sure something is making noises in the dark.",
  },
  {
    slug: "adventures",
    name: "Adventures",
    metaTitle: "Personalized Adventure Books for Kids | StoryBloom",
    metaDescription: "Dinosaurs, mermaids, pirates, trucks, space, sports and more: personalized adventure books built around what your child loves.",
    h1: "Personalized adventure books",
    intro: "Start with whatever your child can't stop talking about, whether that's diggers, dragons, soccer or the moon. Then make them the one who saves the day.",
  },
  {
    slug: "animals",
    name: "Animals",
    metaTitle: "Personalized Animal and Pet Books for Kids | StoryBloom",
    metaDescription: "Personalized stories about puppies, kittens and ponies, for children who love animals or are hoping for a pet of their own.",
    h1: "Personalized books about animals",
    intro: "A runaway puppy, a kitten who won't come down, a shy pony who needs time. Each one is really about learning what another living thing needs.",
  },
  {
    slug: "careers",
    name: "When I grow up",
    metaTitle: "Personalized When I Grow Up Books | StoryBloom",
    metaDescription: "Personalized stories where your child is a doctor, vet, firefighter, pilot, teacher or engineer for a day.",
    h1: "Personalized when-I-grow-up books",
    intro: "Doctor, vet, firefighter, pilot: your child tries on the job for a day, with a real problem to solve and a look at what the work involves.",
  },
  {
    slug: "learning",
    name: "Learning",
    metaTitle: "Personalized ABC and Counting Books | StoryBloom",
    metaDescription: "Personalized alphabet, counting, colors and early reading books for toddlers and new readers, with your child on every page.",
    h1: "Personalized learning books",
    intro: "Letters, numbers, colors and first words are easier to come back to when you're in the book yourself. Simple text for little ones and brand-new readers.",
  },
  {
    slug: "faith",
    name: "Faith",
    metaTitle: "Personalized Faith Books for Kids | StoryBloom",
    metaDescription: "Personalized books for baptism, first communion, bedtime prayers and Bible stories, plus a story for a bar or bat mitzvah.",
    h1: "Personalized books of faith",
    intro: "Keepsakes for a baptism or first communion, a quiet bedtime prayer, and stories from scripture with your child beside the characters.",
  },
  {
    slug: "family-changes",
    name: "Hard moments",
    metaTitle: "Personalized Books for Hard Family Moments | StoryBloom",
    metaDescription: "Gentle personalized stories for the death of a pet or grandparent, two homes, a hospital stay, a deployed parent or adoption.",
    h1: "Personalized books for hard moments",
    intro: "Plain, gentle stories for the times a family needs words: someone has died, a parent is far away, home is changing. Each includes a note for grown-ups. They aren't a substitute for support from your pediatrician or a counselor.",
  },
];

export const liveHubs = () => HUBS.filter((h) => CATALOG.some((b) => b.category === h.slug));
export const getHub = (slug: string) => liveHubs().find((h) => h.slug === slug);
export const getEntry = (slug: string | null | undefined) => CATALOG.find((b) => b.slug === slug);
export const booksInHub = (slug: string) => CATALOG.filter((b) => b.category === slug);
export const coverOf = (slug: string) => `/images/books/${slug}/cover.jpg`;
export const thumbOf = (slug: string) => `/images/books/${slug}/cover-480.webp`;
export const samplePageOf = (slug: string, n: number) => `/images/books/${slug}/page-${n}.webp`;

/** Fill a template: {name}, and {feminine/masculine} word pairs chosen by the hero's pronouns. */
export function renderTemplate(text: string, name: string, pronouns: "she" | "he") {
  return text
    .replace(/\{([^{}/]+)\/([^{}/]+)\}/g, (_m, f: string, m: string) => (pronouns === "she" ? f : m))
    .replace(/\{name\}/g, name);
}

export const exampleTitle = (b: CatalogEntry) => renderTemplate(b.title_pattern, b.example.name, b.example.pronouns);

// ------------------------------------------------------------------ loading full books

// Full files: bundled while prerendering, separate chunks in the browser.
const eager: Record<string, { default: CatalogBook }> = import.meta.env.SSR ? import.meta.glob("./books/*.json", { eager: true }) : {};
const lazy = import.meta.env.SSR ? {} : (import.meta.glob("./books/*.json") as Record<string, () => Promise<{ default: CatalogBook }>>);

/** Only while prerendering. */
export function bookForPrerender(slug: string): CatalogBook | undefined {
  return eager[`./books/${slug}.json`]?.default;
}

export async function loadBook(slug: string): Promise<CatalogBook | null> {
  const load = lazy[`./books/${slug}.json`];
  return load ? (await load()).default : null;
}

// ------------------------------------------------------------------ the wizard's view of a book

const SEASONAL = new Set(["christmas", "holidays"]);

/** A catalog book as a regular story theme, so the wizard and generator treat it like any other. */
export function bookToTheme(b: CatalogBook): StoryTheme {
  return {
    id: b.slug,
    season: SEASONAL.has(b.category) ? "holiday" : "evergreen",
    label: b.title_pattern.replace(/\{name\}/g, "[Name]").replace(/\{([^{}/]+)\/([^{}/]+)\}/g, "$1/$2"),
    title: (h: HeroDetails) => renderTemplate(b.title_pattern, h.name, h.pronouns),
    tagline: b.tagline,
    description: b.promise,
    defaultPages: 10,
    outline: (h: HeroDetails) => b.page_outline.map((p) => renderTemplate(p.beat, h.name, h.pronouns)),
    illustrationGuide: b.illustration_guide,
    accent: "from-primary/10 to-chart-2/15",
    landingPath: `/books/${b.slug}`,
  };
}

/** Makes a catalog book available to getTheme(). Resolves to false if there's no such book. */
export async function ensureBookTheme(slug: string | null | undefined) {
  if (!slug || getTheme(slug)) return !!slug;
  if (!getEntry(slug)) return false;
  const book = await loadBook(slug);
  if (!book) return false;
  registerTheme(bookToTheme(book));
  return true;
}

export { PRONOUNS };
