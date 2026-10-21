import config from "@config";
import type { CartoonStyle } from "@/components/CartoonStyleSelector";
import { PRONOUNS, type HeroDetails, type Pronouns, type StoryTheme } from "./themes";

export interface Appearance {
  hairColor: string;
  hairStyle: string;
  skinTone: string;
  eyeColor: string;
  glasses: boolean;
  other: string;
}

export interface PersonalDetails {
  favoriteAnimal: string;
  favoriteToy: string;
  hobby: string;
  dedication: string;
  /** Shown as the author on the cover, e.g. "Love, Grandma". */
  fromName: string;
}

export type LookMode = "photo" | "describe";

export type CastRole = "sibling" | "friend" | "parent" | "grandparent" | "pet" | "other";

/** Someone besides the hero: a sibling, friend, grown-up or pet. */
export interface CastMember {
  key: string;
  name: string;
  role: CastRole;
  /** People only. */
  age: number | null;
  pronouns: Pronouns | null;
  lookMode: LookMode;
  /** Prepared photo data URLs (see lib/photo.ts). */
  photos: string[];
  /** Short free-text look, e.g. "curly black hair, freckles" or "a fluffy grey cat". */
  description: string;
}

export interface WizardAnswers {
  hero: HeroDetails;
  appearance: Appearance;
  heroLookMode: LookMode;
  heroPhotos: string[];
  others: CastMember[];
  themeId: string;
  style: CartoonStyle;
  details: PersonalDetails;
  pageCount: 10 | 15 | 20;
}

/** e.g. "little sister", "grandpa", "dog". */
export function relationLabel(member: CastMember, hero: HeroDetails) {
  const p = member.pronouns;
  switch (member.role) {
    case "sibling": {
      const word = p === "she" ? "sister" : p === "he" ? "brother" : "sibling";
      if (member.age != null && member.age !== hero.age) return `${member.age < hero.age ? "little" : "big"} ${word}`;
      return word;
    }
    case "parent":
      return p === "she" ? "mom" : p === "he" ? "dad" : "parent";
    case "grandparent":
      return p === "she" ? "grandma" : p === "he" ? "grandpa" : "grandparent";
    case "friend":
      return "best friend";
    case "pet":
      return "pet";
    default:
      return "friend";
  }
}

export type AgeRange = (typeof config.story.ageRanges)[number];

export function ageRangeFor(age: number): AgeRange {
  if (age <= 5) return "3-5 years";
  if (age <= 7) return "5-7 years";
  return "7-9 years";
}

const STYLE_NAMES: Record<CartoonStyle, string> = {
  traditional: "traditional cartoon",
  anime: "anime",
  "3d": "3D animation",
  chibi: "chibi",
};

/** Just the physical look, e.g. "medium skin, dark brown curly hair, wears glasses". */
export function lookSummary(a: Appearance) {
  return [
    a.skinTone && `${a.skinTone} skin`,
    (a.hairColor || a.hairStyle) && `${[a.hairColor, a.hairStyle].filter(Boolean).join(" ")} hair`,
    a.eyeColor && `${a.eyeColor} eyes`,
    a.glasses && "wears glasses",
    a.other.trim(),
  ]
    .filter(Boolean)
    .join(", ");
}

/** Plain-language description of the hero, reused on every illustration. */
export function characterDescription(hero: HeroDetails, a: Appearance) {
  const p = PRONOUNS[hero.pronouns];
  const look = lookSummary(a);
  return `${hero.name}, a ${hero.age}-year-old child (${p.subject}/${p.object})${look ? `, ${look}` : ""}`;
}

function clean(value: string, max = 200) {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

/** Interior plot beats fitted to the requested page count. */
export function fitOutline(beats: string[], interiorPages: number) {
  if (beats.length === interiorPages) return beats;
  if (beats.length > interiorPages) {
    // Merge neighbouring beats so the story still covers the whole outline.
    const merged: string[] = [];
    const per = beats.length / interiorPages;
    for (let i = 0; i < interiorPages; i++) {
      merged.push(beats.slice(Math.round(i * per), Math.round((i + 1) * per)).join(" "));
    }
    return merged;
  }
  return beats;
}

/** Build the prompt sent to the existing story generator. */
export function buildStoryPrompt(theme: StoryTheme, answers: WizardAnswers) {
  const { hero, appearance, heroLookMode, others, details, style, pageCount } = answers;
  const p = PRONOUNS[hero.pronouns];
  const title = theme.title(hero);
  const beats = fitOutline(theme.outline(hero), pageCount);
  const extra =
    pageCount > beats.length
      ? ` There are ${pageCount} story pages and ${beats.length} beats: expand the beats with small, gentle moments so every page moves the story forward.`
      : "";

  const personal = [
    details.favoriteAnimal && `favorite animal: ${clean(details.favoriteAnimal, 60)}`,
    details.favoriteToy && `favorite toy: ${clean(details.favoriteToy, 60)}`,
    details.hobby && `loves: ${clean(details.hobby, 80)}`,
  ].filter(Boolean);

  const lines = [
    `Write a personalized children's picture book titled exactly "${title}".`,
    `The hero is ${hero.name}, age ${hero.age}. Use ${p.subject}/${p.object} pronouns for ${hero.name}. Use ${hero.name}'s name often.`,
    heroLookMode === "describe"
      ? `What ${hero.name} looks like (keep identical on the cover and every page): ${characterDescription(hero, appearance)}.`
      : `${hero.name}'s look comes from a photo; keep ${PRONOUNS[hero.pronouns].object} identical on the cover and every page.`,
    others.length
      ? `Also in the story, on several pages: ${others
          .map((m) => {
            const age = m.role !== "pet" && m.age != null ? `, age ${m.age}` : "";
            const look = m.lookMode === "describe" && m.description.trim() ? `; looks: ${clean(m.description, 160)}` : "";
            return `${m.name} (${hero.name}'s ${relationLabel(m, hero)}${age}${look})`;
          })
          .join("; ")}. Give each of them a real part in the adventure.`
      : "",
    `Reading level: ages ${ageRangeFor(hero.age).replace(" years", "")}. Short sentences, 2–4 per page, warm and playful.`,
    `Follow this plot outline in order, about one beat per page:${extra}`,
    ...beats.map((beat, i) => `${i + 1}. ${beat}`),
    personal.length ? `Weave in these details naturally: ${personal.join("; ")}.` : "",
    `Illustrations: ${STYLE_NAMES[style]} style. ${theme.illustrationGuide} ${hero.name} appears on the front cover with the title.`,
    `Keep it gentle and age-appropriate: no frightening peril, violence or brand names. End on a warm, happy note.`,
  ];

  return lines.filter(Boolean).join("\n");
}

export const EMPTY_APPEARANCE: Appearance = {
  hairColor: "",
  hairStyle: "",
  skinTone: "",
  eyeColor: "",
  glasses: false,
  other: "",
};

export const EMPTY_DETAILS: PersonalDetails = {
  favoriteAnimal: "",
  favoriteToy: "",
  hobby: "",
  dedication: "",
  fromName: "",
};

/** The cast as sent to /stories/generate. Photos are only included with the parent's consent. */
export function castRequest(a: WizardAnswers, photoConsent: boolean) {
  const heroPronouns = PRONOUNS[a.hero.pronouns];
  return [
    {
      name: a.hero.name,
      role: "hero",
      kind: "person",
      age: a.hero.age,
      pronouns: `${heroPronouns.subject}/${heroPronouns.object}`,
      description: a.heroLookMode === "describe" ? lookSummary(a.appearance) : clean(a.appearance.other, 160),
      photoConsent,
      photos: photoConsent && a.heroLookMode === "photo" ? a.heroPhotos : [],
    },
    ...a.others.map((m) => ({
      name: m.name.trim(),
      role: m.role,
      kind: m.role === "pet" ? "pet" : "person",
      age: m.role === "pet" ? undefined : m.age ?? undefined,
      pronouns: m.pronouns ? `${PRONOUNS[m.pronouns].subject}/${PRONOUNS[m.pronouns].object}` : undefined,
      description: clean(m.description, 160),
      photoConsent,
      photos: photoConsent && m.lookMode === "photo" ? m.photos.slice(0, 1) : [],
    })),
  ];
}
