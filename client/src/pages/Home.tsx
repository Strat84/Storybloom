import { Link } from "wouter";
import { BookHeart, Clock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CreateButton,
  ExampleBookCard,
  FaqSection,
  HowItWorks,
  PricingCards,
  Section,
  SectionHeading,
  ThemeGrid,
} from "@/components/marketing";
import { CARTOON_STYLES, styleImage } from "@/components/CartoonStyleSelector";
import VerifiedReviews from "@/components/VerifiedReviews";
import { EVERGREEN_THEMES, HOLIDAY_THEMES } from "@/content/themes";
import { EXAMPLE_BOOKS } from "@/content/examples";
import { generalFaqs } from "@/content/faq";
import { isHolidaySeason } from "@/lib/holiday";
import { useNow } from "@/lib/useNow";

export default function Home() {
  const holiday = isHolidaySeason(useNow());

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/10 via-background to-background">
        <div className="container mx-auto px-4 sm:px-6 py-10 sm:py-16 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div className="text-center lg:text-left">
            <p className="inline-block rounded-full bg-primary/10 text-primary text-sm font-semibold px-3 py-1 mb-4">
              {holiday ? "The most personal gift this holiday" : "A book where your child is the hero"}
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold leading-tight mb-4">
              Personalized storybooks starring <span className="text-primary">your child</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground font-story mb-6 max-w-xl mx-auto lg:mx-0">
              Upload a photo (or describe them), pick an adventure, and StoryBloom writes and illustrates a picture book all about them.
              Preview it free, then download it instantly or order a printed keepsake.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <CreateButton label="Create your book" />
              <Button asChild size="lg" variant="outline" className="text-base">
                <Link href="/examples">See example books</Link>
              </Button>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 justify-center lg:justify-start text-sm text-muted-foreground">
              <li className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-primary" aria-hidden />Ready in minutes</li>
              <li className="flex items-center gap-1.5"><BookHeart className="h-4 w-4 text-primary" aria-hidden />Preview before you pay</li>
              <li className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-primary" aria-hidden />Private to your account</li>
            </ul>
          </div>
          <div>
            <img
              src="/images/hero-1024.webp"
              srcSet="/images/hero-640.webp 640w, /images/hero-1024.webp 1024w, /images/hero-1440.webp 1440w"
              sizes="(min-width: 1024px) 50vw, 100vw"
              width={1024}
              height={559}
              alt="Illustrated children reading glowing storybooks surrounded by storybook characters"
              {...{ fetchpriority: "high" }}
              decoding="async"
              className="w-full h-auto rounded-3xl shadow-xl"
            />
          </div>
        </div>
      </section>

      {holiday ? (
        <ThemeGrid
          themes={HOLIDAY_THEMES}
          title="Holiday stories starring your child"
          subtitle="Each story has a planned plot, so it reads like a real picture book."
        />
      ) : (
        <ThemeGrid themes={EVERGREEN_THEMES} title="Pick an adventure" subtitle="Each story has a planned plot, so it reads like a real picture book." />
      )}

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

      <Section>
        <SectionHeading title="Four illustration styles" subtitle="Your child appears in the style you pick on the cover and every page." />
        <ul className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
          {CARTOON_STYLES.map((s) => (
            <li key={s.id} className="rounded-2xl border bg-card overflow-hidden">
              <img
                src={styleImage(s.id)}
                srcSet={`${styleImage(s.id, 400)} 400w, ${styleImage(s.id, 800)} 800w`}
                sizes="(min-width: 1024px) 280px, 45vw"
                width={400}
                height={300}
                loading="lazy"
                decoding="async"
                alt={`${s.name} illustration style`}
                className="w-full aspect-[4/3] object-cover"
              />
              <div className="p-3">
                <h3 className="font-display font-bold">{s.name}</h3>
                <p className="text-sm text-muted-foreground font-story">{s.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

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
