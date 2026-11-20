import { Link } from "wouter";
import { ArrowRight, Clock, Eye, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CreateButton,
  ExampleBookCard,
  FaqSection,
  HowItWorks,
  PhotoToCartoon,
  PricingCards,
  Section,
  SectionHeading,
  ThemeGrid,
} from "@/components/marketing";
import VerifiedReviews from "@/components/VerifiedReviews";
import { EVERGREEN_THEMES, HOLIDAY_THEMES } from "@/content/themes";
import { EXAMPLE_BOOKS, coverOf, getExample } from "@/content/examples";
import { digitalPrice, formatPrice, printPrice } from "@/lib/pricing";
import { BOOK_LANGUAGES } from "@/content/languages";
import { generalFaqs } from "@/content/faq";
import { isHolidaySeason } from "@/lib/holiday";
import { useNow } from "@/lib/useNow";
import { activeSale, type Sale } from "@/lib/sale";
import { withOffer } from "@/lib/checkout";
import { BookCategoryLinks } from "@/pages/Books";

export default function Home() {
  const now = useNow();
  const holiday = isHolidaySeason(now);
  const sale = activeSale(now);

  return (
    <>
      {/* Everything a visitor needs is on the first screen: what it is, real books as proof, the button, and what it costs. */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/10 via-background to-background">
        <div className="container mx-auto px-4 sm:px-6 pt-6 pb-8 sm:py-14 grid grid-cols-1 lg:grid-cols-2 gap-x-12 items-center">
          <div className="text-center lg:text-left lg:self-end">
            {sale ? (
              <p className="inline-flex items-center gap-2 rounded-full bg-neutral-950 text-white text-xs sm:text-sm font-semibold pl-1 pr-3 py-1 mb-3">
                <span className="rounded-full bg-amber-400 text-neutral-950 px-2 py-0.5 font-extrabold uppercase tracking-wide">{sale.name}</span>
                {sale.pct}% off every printed book
              </p>
            ) : (
              <p className="inline-block rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-semibold px-3 py-1 mb-3">
                {holiday ? "The most personal gift this holiday" : "From one photo, a book starring your child"}
              </p>
            )}
            <h1 className="text-[2rem] leading-[1.1] sm:text-5xl lg:text-6xl font-display font-bold sm:leading-tight mb-3">
              Personalized storybooks starring <span className="text-primary">your child</span>
            </h1>
            <p className="text-base sm:text-xl text-muted-foreground font-story max-w-xl mx-auto lg:mx-0">
              Upload a photo and your child becomes the illustrated hero of a real picture book, with family and pets along for the adventure.
            </p>
          </div>

          <HeroBooks holiday={holiday} sale={sale} />

          <div className="text-center lg:text-left lg:col-start-1 lg:self-start lg:mt-6">
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <CreateButton label="Create your book" />
              <Button asChild size="lg" variant="outline" className="text-base hidden sm:inline-flex">
                <Link href="/examples">See example books</Link>
              </Button>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Free to create and preview. Keep it as a <span className="text-foreground font-medium">PDF for {formatPrice(digitalPrice())}</span> or
              a <span className="text-foreground font-medium">printed book for {sale ? (
                <><s className="font-normal text-muted-foreground">{formatPrice(printPrice())}</s> <span className="text-red-600 font-bold">{formatPrice(withOffer(printPrice(), sale.pct))}</span></>
              ) : formatPrice(printPrice())}</span>, shipping included.
            </p>
            <ul className="mt-4 grid grid-cols-3 gap-2 max-w-md mx-auto sm:max-w-none sm:flex sm:flex-wrap sm:justify-center lg:justify-start sm:gap-x-6 text-xs sm:text-sm text-muted-foreground">
              <li className="flex flex-col sm:flex-row items-center gap-1 sm:gap-1.5 sm:whitespace-nowrap"><Eye className="h-4 w-4 text-primary shrink-0" aria-hidden />See every page first</li>
              <li className="flex flex-col sm:flex-row items-center gap-1 sm:gap-1.5 sm:whitespace-nowrap"><Clock className="h-4 w-4 text-primary shrink-0" aria-hidden />Ready in minutes</li>
              <li className="flex flex-col sm:flex-row items-center gap-1 sm:gap-1.5 sm:whitespace-nowrap"><Languages className="h-4 w-4 text-primary shrink-0" aria-hidden />{BOOK_LANGUAGES.length} languages</li>
            </ul>
          </div>
        </div>
      </section>

      <PhotoToCartoon />

      {holiday ? (
        <ThemeGrid
          themes={HOLIDAY_THEMES}
          title="Holiday stories starring your child"
          subtitle="Each story has a planned plot, so it reads like a real picture book."
        />
      ) : (
        <ThemeGrid themes={EVERGREEN_THEMES} title="Pick an adventure" subtitle="Each story has a planned plot, so it reads like a real picture book." />
      )}

      <BookCategoryLinks />

      <HowItWorks />

      {holiday && (
        <ThemeGrid themes={EVERGREEN_THEMES} title="Adventures for any time of year" subtitle="Birthdays, space missions and welcoming a new baby." />
      )}

      {EXAMPLE_BOOKS.length > 0 && (
        <Section>
          <SectionHeading title="Example books" subtitle="Flip through real books made with StoryBloom." />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
            {EXAMPLE_BOOKS.map((book) => (
              <ExampleBookCard key={book.slug} book={book} />
            ))}
          </div>
        </Section>
      )}

      <Section id="pricing">
        <SectionHeading title="Simple pricing" subtitle="Creating and previewing is free. Pay only for the book you want." />
        <PricingCards />
        <p className="text-center mt-6">
          <Link href="/pricing" className="text-primary font-medium hover:underline">See pricing and shipping details</Link>
        </p>
      </Section>

      <div className="container mx-auto px-4 sm:px-6">
        <VerifiedReviews />
      </div>

      <FaqSection faqs={generalFaqs()} />

      <Section className="text-center">
        <div className="rounded-3xl bg-gradient-to-r from-primary/15 via-chart-2/15 to-primary/15 p-8 sm:p-12 max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-display font-bold mb-3">Make them the hero of their own story</h2>
          <p className="text-lg text-muted-foreground font-story mb-6">It takes about five minutes, and you'll see the whole book before you buy.</p>
          <CreateButton label="Create your book" />
        </div>
      </Section>
    </>
  );
}

/** Three real example covers, fanned like books on a table, with the photo they start from. Each cover opens that book. */
function HeroBooks({ holiday, sale }: { holiday: boolean; sale: Sale | null }) {
  const slugs = holiday
    ? ["elis-first-hanukkah-lights", "mia-saves-christmas", "a-night-at-the-north-pole-with-ezra"]
    : ["sofia-the-space-explorer", "noahs-birthday-adventure", "zoe-the-big-sister"];
  const books = slugs.map(getExample).filter((b) => b !== undefined);
  if (books.length < 3) return null;
  const place = [
    "left-0 top-6 -rotate-6 w-[34%] z-0",
    "left-1/2 -translate-x-1/2 top-0 w-[40%] z-10",
    "right-0 top-6 rotate-6 w-[34%] z-0",
  ];
  return (
    <div className="lg:col-start-2 lg:row-start-1 lg:row-span-2 my-5 lg:my-0">
      <div className="relative mx-auto w-full max-w-[22rem] sm:max-w-md lg:max-w-lg aspect-[16/11]">
        {books.map((book, i) => {
          const cover = coverOf(book);
          return (
            <Link
              key={book.slug}
              href={`/examples/${book.slug}`}
              className={`absolute block rounded-xl overflow-hidden shadow-xl ring-1 ring-black/5 bg-muted transition-transform hover:-translate-y-1 hover:z-20 ${place[i]}`}
            >
              <img
                src={cover.image}
                width={cover.width}
                height={cover.height}
                alt={`Cover of the example book ${book.title}`}
                {...(i === 1 ? { fetchpriority: "high" } : {})}
                decoding="async"
                className="w-full aspect-[3/4] object-cover"
              />
            </Link>
          );
        })}
        {sale && (
          <Link
            href="/create"
            aria-label={`${sale.name}: ${sale.pct}% off printed books`}
            className="absolute z-30 -top-3 right-[6%] sm:right-[10%] h-[4.5rem] w-[4.5rem] sm:h-24 sm:w-24 rotate-12 rounded-full bg-red-600 text-white shadow-xl ring-4 ring-amber-300 flex flex-col items-center justify-center leading-none"
          >
            <span className="text-xl sm:text-3xl font-extrabold">{sale.pct}%</span>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wide">off print</span>
          </Link>
        )}
        <Link
          href="/examples"
          className="absolute z-20 -bottom-1 inset-x-0 mx-auto w-fit max-w-full flex items-center gap-1.5 rounded-full bg-card/95 backdrop-blur border shadow-md pl-1 pr-3 py-1 text-xs font-semibold whitespace-nowrap"
        >
          <img src="/images/photo-demo/photo-400.webp" width={400} height={548} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover object-top" />
          <ArrowRight className="h-3 w-3 text-primary" aria-hidden />
          <span className="h-7 w-7 shrink-0 rounded-full overflow-hidden bg-white"><img src="/images/photo-demo/3d-400.webp" width={400} height={548} alt="" className="w-full h-auto scale-[1.9] origin-[50%_8%]" /></span>
          <span>One photo, every page. See the books</span>
        </Link>
      </div>
    </div>
  );
}
