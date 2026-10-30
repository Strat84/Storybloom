import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { CheckCircle2, Truck } from "lucide-react";
import config from "@config";
import { Breadcrumbs, CreateButton, FaqSection, HowItWorks, Section, SectionHeading } from "@/components/marketing";
import VerifiedReviews from "@/components/VerifiedReviews";
import NotFound from "@/pages/NotFound";
import { generalFaqs } from "@/content/faq";
import {
  CATALOG,
  bookForPrerender,
  booksInHub,
  exampleTitle,
  getEntry,
  getHub,
  loadBook,
  liveHubs,
  renderTemplate,
  samplePageOf,
  thumbOf,
  coverOf,
  type BookPageData,
  type CatalogEntry,
  type Hub,
} from "@/content/catalog";
import { activeCutoff, formatCutoff, holidayPhase } from "@/lib/holiday";
import { digitalPrice, formatPrice, printPrice, shippingMethods } from "@/lib/pricing";
import { track } from "@/lib/track";
import { useNow } from "@/lib/useNow";

const AGE_FILTERS = [
  { id: "all", label: "All ages", min: 0, max: 99 },
  { id: "baby", label: "Babies and toddlers", min: 0, max: 2 },
  { id: "young", label: "Ages 3-5", min: 3, max: 5 },
  { id: "older", label: "Ages 6-9", min: 6, max: 9 },
];

function fitsAge(b: CatalogEntry, min: number, max: number) {
  const [low, high] = b.age_range.split("-").map(Number);
  return low <= max && high >= min;
}

const EXAMPLE_BADGE = "Example: your child's name and likeness go here";

function ExampleBadge() {
  return <span className="inline-block rounded-full bg-background/95 border text-xs font-medium px-2.5 py-1 shadow-sm">{EXAMPLE_BADGE}</span>;
}

export function BookCard({ book }: { book: CatalogEntry }) {
  return (
    <article className="rounded-2xl border bg-card overflow-hidden flex flex-col">
      <Link href={`/books/${book.slug}`} className="block">
        <img src={thumbOf(book.slug)} alt={book.image_alt} width={480} height={640} loading="lazy" className="w-full h-auto" />
      </Link>
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-display font-bold leading-snug mb-1">
          <Link href={`/books/${book.slug}`} className="hover:text-primary">
            {book.title_pattern.replace(/\{name\}/g, "Your Child").replace(/\{([^{}/]+)\/([^{}/]+)\}/g, "$1/$2")}
          </Link>
        </h3>
        <p className="text-sm font-story text-muted-foreground flex-1">{book.tagline}</p>
        <p className="text-xs text-muted-foreground mt-2">Ages {book.age_range}</p>
      </div>
    </article>
  );
}

function BookGrid({ books }: { books: CatalogEntry[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
      {books.map((b) => <BookCard key={b.slug} book={b} />)}
    </div>
  );
}

function HubLinks({ current }: { current?: string }) {
  return (
    <nav aria-label="Book categories" className="flex flex-wrap justify-center gap-2 max-w-4xl mx-auto">
      {liveHubs().map((h) => (
        <Link
          key={h.slug}
          href={`/books/${h.slug}`}
          aria-current={h.slug === current ? "page" : undefined}
          className={`rounded-full border px-3 py-1.5 text-sm font-medium ${h.slug === current ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:border-primary"}`}
        >
          {h.name}
        </Link>
      ))}
    </nav>
  );
}

/** Top categories, for the homepage. */
export function BookCategoryLinks() {
  if (!CATALOG.length) return null;
  return (
    <Section>
      <SectionHeading title="A book for every child and occasion" subtitle="Holidays, birthdays, big firsts and whatever they love most." />
      <HubLinks />
      <p className="text-center mt-5">
        <Link href="/books" className="text-primary font-medium hover:underline">See all books</Link>
      </p>
    </Section>
  );
}

export function BooksCatalog() {
  const [age, setAge] = useState("all");
  const filter = AGE_FILTERS.find((f) => f.id === age) ?? AGE_FILTERS[0];
  const books = CATALOG.filter((b) => fitsAge(b, filter.min, filter.max));
  return (
    <>
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Books", path: "/books" }]} />
      <Section className="pb-6">
        <SectionHeading
          as="h1"
          title="Personalized children's books"
          subtitle="Pick a story, then make your child the illustrated hero with their name and likeness. Every book is created fresh for one child."
        />
        <HubLinks />
        <div role="group" aria-label="Filter by age" className="flex flex-wrap justify-center gap-2 mt-5">
          {AGE_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={f.id === age}
              onClick={() => setAge(f.id)}
              className={`rounded-full border px-3 py-1 text-sm ${f.id === age ? "bg-foreground text-background" : "bg-background"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </Section>
      <Section className="pt-0">
        <BookGrid books={books} />
      </Section>
    </>
  );
}

function HubPage({ hub }: { hub: Hub }) {
  return (
    <>
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Books", path: "/books" }, { name: hub.name, path: `/books/${hub.slug}` }]} />
      <Section className="pb-6">
        <SectionHeading as="h1" title={hub.h1} subtitle={hub.intro} />
        <HubLinks current={hub.slug} />
      </Section>
      <Section className="pt-0">
        <BookGrid books={booksInHub(hub.slug)} />
      </Section>
      <HowItWorks />
    </>
  );
}

function OneOfAKind() {
  const points = [
    "Your child becomes the illustrated hero, drawn from your photo",
    "Their name, age and details are written into the story",
    "Every book is created fresh for your child; no two are alike",
    "Add a sibling, pet or grandparent, and a personal dedication",
    "Preview the whole book free before you buy",
  ];
  return (
    <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-display font-bold mb-3">One of a kind, made for your child</h2>
      <ul className="space-y-2">
        {points.map((p) => (
          <li key={p} className="flex gap-2 font-story">
            <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden />
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The page's data is embedded when prerendered, so hydration doesn't wait for a download. */
function usePageData(slug: string) {
  const [data, setData] = useState<BookPageData | null>(() => {
    const ssr = bookForPrerender(slug);
    if (ssr) return ssr;
    if (typeof document === "undefined") return null;
    const el = document.getElementById("book-data");
    if (!el?.textContent) return null;
    const parsed = JSON.parse(el.textContent) as BookPageData;
    return parsed.slug === slug ? parsed : null;
  });
  useEffect(() => {
    if (data?.slug === slug) return;
    let live = true;
    loadBook(slug).then((b) => { if (live && b) setData(b); });
    return () => { live = false; };
  }, [slug, data]);
  return data?.slug === slug ? data : null;
}

function pageDataJson(b: BookPageData) {
  const { slug, title_pattern, category, age_range, tagline, meta_title, meta_description, image_alt, h1, example, sensitive, promise, story_summary, why_parents, for_grownups, faqs, sample_pages } = b;
  return JSON.stringify({ slug, title_pattern, category, age_range, tagline, meta_title, meta_description, image_alt, h1, example, sensitive, promise, story_summary, why_parents, for_grownups, faqs, sample_pages }).replace(/</g, "\\u003c");
}

function BookPage({ entry }: { entry: CatalogEntry }) {
  const book = usePageData(entry.slug);
  const now = useNow();
  const phase = holidayPhase(now);
  const cutoff = activeCutoff(phase);
  const hub = getHub(entry.category);
  const createHref = `/create?theme=${entry.slug}`;
  const createLabel = "Create this book for your child";
  const title = exampleTitle(entry);

  useEffect(() => {
    track("view_content", { content_type: "book", content_ids: [entry.slug], content_name: entry.slug, content_category: entry.category });
  }, [entry.slug, entry.category]);

  const related = [...booksInHub(entry.category), ...CATALOG].filter((b, i, all) => b.slug !== entry.slug && all.findIndex((x) => x.slug === b.slug) === i).slice(0, 4);
  const standard = shippingMethods()[0];

  return (
    <>
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "Books", path: "/books" },
          ...(hub ? [{ name: hub.name, path: `/books/${hub.slug}` }] : []),
          { name: title, path: `/books/${entry.slug}` },
        ]}
      />

      <section className="container mx-auto px-4 sm:px-6 pt-6 pb-10 grid md:grid-cols-2 gap-8 items-center max-w-5xl">
        <figure className="relative">
          <img src={coverOf(entry.slug)} alt={entry.image_alt} width={900} height={1200} fetchPriority="high" className="w-full h-auto rounded-2xl shadow-md border" />
          <figcaption className="absolute left-3 bottom-3"><ExampleBadge /></figcaption>
        </figure>
        <div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold leading-tight mb-3">{entry.h1}</h1>
          <p className="text-lg font-story text-muted-foreground mb-4">{book?.promise ?? entry.tagline}</p>
          <p className="text-lg font-semibold mb-4">
            {formatPrice(printPrice())} printed, free US shipping
            <span className="block text-sm font-normal text-muted-foreground">or {formatPrice(digitalPrice())} as a digital PDF</span>
          </p>
          <span onClick={() => track("view_content", { content_type: "book_create_click", content_ids: [entry.slug], content_name: entry.slug })}>
            <CreateButton href={createHref} label={createLabel} />
          </span>
          <p className="text-sm text-muted-foreground mt-3">Free to create and preview. No credit card needed.</p>
        </div>
      </section>

      <div className="container mx-auto px-4 sm:px-6"><OneOfAKind /></div>

      {entry.category === "christmas" && phase !== "off" && (
        <div className="container mx-auto px-4 sm:px-6 mt-6">
          <div className="max-w-3xl mx-auto rounded-2xl border p-5 flex gap-3 items-start">
            <Truck className="h-6 w-6 text-primary shrink-0" aria-hidden />
            <p className="text-sm text-muted-foreground">
              {cutoff
                ? `Order your printed book by ${formatCutoff(cutoff)}${phase === "expressOnly" ? " with expedited shipping" : ""} for delivery before Christmas. `
                : "Printed books ordered now will arrive after Christmas. "}
              The digital book is ready instantly, any time.
            </p>
          </div>
        </div>
      )}

      {book && (
        <>
          <Section>
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-display font-bold mb-3">What happens in the story</h2>
              <p className="font-story text-lg text-foreground/80">{book.story_summary}</p>
            </div>
          </Section>

          <Section className="pt-0">
            <SectionHeading title="Inside the book" subtitle={`Sample pages from an example made for ${entry.example.name}.`} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {book.sample_pages.map((p, i) => (
                <figure key={i} className="rounded-2xl border bg-card overflow-hidden">
                  <div className="relative">
                    <img src={samplePageOf(entry.slug, i + 1)} alt={`Sample page ${i + 1} of ${title}`} width={750} height={1000} loading="lazy" className="w-full h-auto" />
                    <span className="absolute left-3 bottom-3"><ExampleBadge /></span>
                  </div>
                  <figcaption className="p-4 font-story">{renderTemplate(p.text, entry.example.name, entry.example.pronouns)}</figcaption>
                </figure>
              ))}
            </div>
          </Section>

          <Section className="pt-0">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-display font-bold mb-3">Why parents choose this book</h2>
              {book.why_parents.map((p, i) => <p key={i} className="font-story text-lg text-foreground/80 mb-3">{p}</p>)}
              {book.for_grownups.length > 0 && (
                <div className="rounded-2xl bg-muted/50 p-5 mt-5">
                  <h3 className="font-semibold mb-2">For grown-ups</h3>
                  <ul className="list-disc pl-5 space-y-1 font-story text-foreground/80">
                    {book.for_grownups.map((t, i) => <li key={i}>{t}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </Section>
        </>
      )}

      <Section className="pt-0">
        <div className="max-w-3xl mx-auto rounded-2xl border bg-card p-6">
          <h2 className="text-2xl font-display font-bold mb-3">Details</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 font-story">
            <dt className="font-semibold">Best for</dt><dd>Ages {entry.age_range}</dd>
            <dt className="font-semibold">Length</dt><dd>{config.story.pageCounts.join(", ").replace(/, (\d+)$/, " or $1")} story pages, your choice</dd>
            <dt className="font-semibold">Printed book</dt><dd>{formatPrice(printPrice())} softcover, free standard shipping in the US ({standard.minDays}-{standard.maxDays} business days)</dd>
            <dt className="font-semibold">Digital PDF</dt><dd>{formatPrice(digitalPrice())}, ready right away</dd>
            <dt className="font-semibold">Returns</dt><dd>Free reprint or refund if it arrives damaged or misprinted. <Link href="/shipping-returns" className="underline">Shipping and returns</Link></dd>
          </dl>
        </div>
      </Section>

      <HowItWorks />

      <div className="container mx-auto px-4 sm:px-6"><VerifiedReviews /></div>

      {book && <FaqSection faqs={[...book.faqs, ...generalFaqs().slice(0, 3)]} />}

      <Section>
        <SectionHeading title="You might also like" />
        <BookGrid books={related} />
      </Section>

      <Section className="text-center pt-0">
        <CreateButton href={createHref} label={createLabel} />
      </Section>

      {book && <script id="book-data" type="application/json" dangerouslySetInnerHTML={{ __html: pageDataJson(book) }} />}
    </>
  );
}

/** /books/<slug>: a category page or a book page. */
export function BooksSlug() {
  const { slug = "" } = useParams<{ slug: string }>();
  const hub = getHub(slug);
  if (hub) return <HubPage hub={hub} />;
  const entry = getEntry(slug);
  return entry ? <BookPage key={entry.slug} entry={entry} /> : <NotFound />;
}

/** Shipping and returns: linked from book pages and given to Google Merchant Center. */
export function ShippingReturns() {
  return (
    <Section>
      <div className="max-w-3xl mx-auto space-y-6 font-story">
        <h1 className="text-3xl sm:text-4xl font-display font-bold">Shipping and returns</h1>
        <div>
          <h2 className="text-2xl font-display font-bold mb-2">Shipping</h2>
          <p className="mb-2">Printed books are made to order and ship within the United States. Delivery times include printing.</p>
          <ul className="list-disc pl-5 space-y-1">
            {shippingMethods().map((m) => (
              <li key={m.id}>{m.label}: {m.price ? formatPrice(m.price) : "free"}, {m.minDays}-{m.maxDays} business days</li>
            ))}
          </ul>
          <p className="mt-2">Digital PDF books are ready to download right away.</p>
        </div>
        <div>
          <h2 className="text-2xl font-display font-bold mb-2">Returns and refunds</h2>
          <p className="mb-2">
            Every book is printed for one child, so we can't take returns or give refunds for a change of mind. That's why you can preview the whole book free before you buy.
          </p>
          <p className="mb-2">
            <strong>If your printed book arrives damaged or misprinted, we'll send a free reprint or give you a refund, your choice.</strong> Email{" "}
            <a className="underline" href={`mailto:${config.site.supportEmail}`}>{config.site.supportEmail}</a> within 30 days of delivery with your order details and a photo of the problem.
            You don't need to send the book back.
          </p>
          <p>If a book never arrives, email us and we'll make it right.</p>
          <p className="mt-2">Digital PDFs can't be returned once downloaded. If a file is faulty, email us and we'll fix it or refund you.</p>
        </div>
      </div>
    </Section>
  );
}
