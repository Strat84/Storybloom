import data from "./examples.generated.json";

export interface ExamplePage {
  type: "COVER_FRONT" | "PAGE" | "COVER_BACK";
  text: string;
  image: string;
  width: number;
  height: number;
}

export interface ExampleBook {
  slug: string;
  storyId: string;
  title: string;
  description: string;
  pages: ExamplePage[];
}

/** Snapshot of the public example books (see scripts/fetch-examples.mjs). */
export const EXAMPLE_BOOKS = data as ExampleBook[];

export function getExample(slug: string | undefined) {
  return EXAMPLE_BOOKS.find((b) => b.slug === slug);
}

export function coverOf(book: ExampleBook) {
  return book.pages.find((p) => p.type === "COVER_FRONT") ?? book.pages[0];
}

export function storyPagesOf(book: ExampleBook) {
  return book.pages.filter((p) => p.type === "PAGE");
}
