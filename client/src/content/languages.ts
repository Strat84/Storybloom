/**
 * Languages a book can be written in. Keep in sync with services/languages.js in the
 * backend, which checks the code and has fonts for every one of these.
 */
export interface BookLanguage {
  code: string;
  /** English name, used in prompts and labels. */
  name: string;
  /** Name in the language itself. */
  native: string;
}

export const BOOK_LANGUAGES: BookLanguage[] = [
  { code: "en", name: "English", native: "English" },
  { code: "es", name: "Spanish", native: "Español" },
  { code: "fr", name: "French", native: "Français" },
  { code: "de", name: "German", native: "Deutsch" },
  { code: "it", name: "Italian", native: "Italiano" },
  { code: "pt", name: "Portuguese", native: "Português" },
  { code: "nl", name: "Dutch", native: "Nederlands" },
  { code: "pl", name: "Polish", native: "Polski" },
  { code: "tr", name: "Turkish", native: "Türkçe" },
  { code: "ru", name: "Russian", native: "Русский" },
  { code: "uk", name: "Ukrainian", native: "Українська" },
  { code: "ar", name: "Arabic", native: "العربية" },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "zh", name: "Chinese (Simplified)", native: "简体中文" },
  { code: "zh-TW", name: "Chinese (Traditional)", native: "繁體中文" },
  { code: "ja", name: "Japanese", native: "日本語" },
  { code: "ko", name: "Korean", native: "한국어" },
  { code: "vi", name: "Vietnamese", native: "Tiếng Việt" },
  { code: "th", name: "Thai", native: "ไทย" },
  { code: "tl", name: "Filipino (Tagalog)", native: "Filipino" },
  { code: "id", name: "Indonesian", native: "Bahasa Indonesia" },
];

export function bookLanguage(code: string | null | undefined) {
  return BOOK_LANGUAGES.find((l) => l.code === code) ?? BOOK_LANGUAGES[0];
}

/** The visitor's browser language, if we can write books in it. */
export function browserBookLanguage(): string {
  if (typeof navigator === "undefined") return "en";
  for (const tag of navigator.languages ?? [navigator.language]) {
    const lower = tag.toLowerCase();
    if (lower.startsWith("zh")) return /tw|hk|mo|hant/.test(lower) ? "zh-TW" : "zh";
    if (lower.startsWith("fil")) return "tl";
    const base = lower.split("-")[0];
    const match = BOOK_LANGUAGES.find((l) => l.code === base);
    if (match) return match.code;
  }
  return "en";
}
