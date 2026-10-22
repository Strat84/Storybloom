import { CheckCircle2, Truck } from "lucide-react";
import {
  Breadcrumbs,
  CreateButton,
  FaqSection,
  HowItWorks,
  PhotoToCartoon,
  PricingCards,
  SampleBookViewer,
  Section,
  SectionHeading,
  ThemeCard,
} from "@/components/marketing";
import VerifiedReviews from "@/components/VerifiedReviews";
import { christmasFaqs, generalFaqs } from "@/content/faq";
import type { LandingPage } from "@/content/landing";
import { getTheme } from "@/content/themes";
import { EXAMPLE_BOOKS, getExample } from "@/content/examples";
import { activeCutoff, formatCutoff, holidayPhase } from "@/lib/holiday";
import { useNow } from "@/lib/useNow";

export function landingFaqs(page: LandingPage) {
  return [...(page.holiday ? christmasFaqs() : []), ...page.faqs, ...generalFaqs().slice(0, 6)];
}

export default function Landing({ page }: { page: LandingPage }) {
  const now = useNow();
  const phase = holidayPhase(now);
  const cutoff = activeCutoff(phase);
  const themes = page.themeIds.map((id) => getTheme(id)).filter((t): t is NonNullable<typeof t> => !!t);
  const createHref = `/create?theme=${page.themeIds[0]}`;
  const sample = getExample(page.sampleSlug) ?? EXAMPLE_BOOKS[0];

  return (
    <>
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: page.breadcrumb, path: page.path }]} />
      <section className="container mx-auto px-4 sm:px-6 pt-6 pb-10 sm:pb-14 text-center max-w-3xl">
        <p className="inline-block rounded-full bg-primary/10 text-primary text-sm font-semibold px-3 py-1 mb-4">{page.eyebrow}</p>
        <h1 className="text-4xl sm:text-5xl font-display font-bold leading-tight mb-4">{page.h1}</h1>
        <p className="text-lg sm:text-xl text-muted-foreground font-story mb-6">{page.intro}</p>
        <CreateButton href={createHref} label={page.ctaLabel} />
        <p className="text-sm text-muted-foreground mt-3">Free to create and preview. No credit card needed.</p>
      </section>

      {page.holiday && phase !== "off" && (
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto rounded-2xl border-2 border-primary/30 bg-primary/5 p-5 flex gap-3 items-start">
            <Truck className="h-6 w-6 text-primary shrink-0" aria-hidden />
            <div>
              <h2 className="font-semibold text-lg">Christmas delivery deadlines</h2>
              <p className="text-sm text-muted-foreground">
                {cutoff
                  ? `Order your printed book by ${formatCutoff(cutoff)}${phase === "expressOnly" ? " with expedited shipping" : ""} for delivery by Christmas. `
                  : "Printed books ordered now will arrive after Christmas. "}
                The digital book is ready instantly, any time.
              </p>
            </div>
          </div>
        </div>
      )}

      <Section>
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {page.benefits.map((b) => (
            <li key={b.title} className="rounded-2xl border bg-card p-6">
              <CheckCircle2 className="h-6 w-6 text-primary mb-3" aria-hidden />
              <h2 className="text-lg font-display font-bold mb-1">{b.title}</h2>
              <p className="text-muted-foreground font-story">{b.text}</p>
            </li>
          ))}
        </ul>
      </Section>

      {page.photoDemo && <PhotoToCartoon title="See a photo become a storybook character" />}

      {themes.length > 0 && (
        <Section>
          <SectionHeading title={themes.length > 1 ? "Choose a story" : "The story"} />
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${themes.length > 2 ? "lg:grid-cols-4" : ""} gap-4 max-w-6xl mx-auto`}>
            {themes.map((t) => <ThemeCard key={t.id} theme={t} />)}
          </div>
        </Section>
      )}

      {sample && (
        <Section>
          <SectionHeading title="See inside a StoryBloom book" subtitle={`Sample pages from the example book "${sample.title}".`} />
          <SampleBookViewer book={sample} />
        </Section>
      )}

      {page.sections.length > 0 && (
        <Section>
          <div className="max-w-3xl mx-auto space-y-10">
            {page.sections.map((s) => (
              <div key={s.heading}>
                <h2 className="text-2xl sm:text-3xl font-display font-bold mb-3">{s.heading}</h2>
                {s.paragraphs.map((p, i) => <p key={i} className="font-story text-lg text-foreground/80 mb-3">{p}</p>)}
              </div>
            ))}
          </div>
        </Section>
      )}

      <HowItWorks />

      <Section>
        <SectionHeading title="Pricing" subtitle="Creating and previewing is free." />
        <PricingCards />
      </Section>

      <div className="container mx-auto px-4 sm:px-6">
        <VerifiedReviews />
      </div>

      <FaqSection faqs={landingFaqs(page)} />

      <Section className="text-center">
        <div className="rounded-3xl bg-gradient-to-r from-primary/15 via-chart-2/15 to-primary/15 p-8 sm:p-12 max-w-4xl mx-auto">
          <h2 className="text-3xl font-display font-bold mb-3">{page.h1}</h2>
          <p className="text-muted-foreground font-story mb-6">It takes about five minutes, and you'll see the whole book before you buy.</p>
          <CreateButton href={createHref} label={page.ctaLabel} />
        </div>
      </Section>
    </>
  );
}
