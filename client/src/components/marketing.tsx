import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, BookOpen, CheckCircle2, ChevronLeft, ChevronRight, Download, Palette, Sparkles, Truck, UserRound } from "lucide-react";
import config from "@config";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import type { Faq } from "@/content/faq";
import type { StoryTheme } from "@/content/themes";
import { coverOf, type ExampleBook } from "@/content/examples";
import { digitalPrice, formatPrice, printPrice, shippingMethods } from "@/lib/pricing";

export function Section({ id, className, children }: { id?: string; className?: string; children: React.ReactNode }) {
  return (
    <section id={id} className={cn("container mx-auto px-4 sm:px-6 py-12 sm:py-16", className)}>
      {children}
    </section>
  );
}

export function SectionHeading({ title, subtitle, as: As = "h2" }: { title: string; subtitle?: string; as?: "h1" | "h2" }) {
  return (
    <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
      <As className="text-3xl sm:text-4xl font-display font-bold mb-3">{title}</As>
      {subtitle && <p className="text-muted-foreground font-story text-lg">{subtitle}</p>}
    </div>
  );
}

export function Breadcrumbs({ items }: { items: { name: string; path: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="container mx-auto px-4 sm:px-6 pt-6">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        {items.map((item, i) => (
          <li key={item.path} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5" aria-hidden />}
            {i === items.length - 1 ? (
              <span aria-current="page" className="text-foreground">{item.name}</span>
            ) : (
              <Link href={item.path} className="hover:text-primary">{item.name}</Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function CreateButton({ href = "/create", label = "Create your book", size = "lg" }: { href?: string; label?: string; size?: "lg" | "default" }) {
  return (
    <Button asChild size={size} className="gap-2 text-base px-6">
      <Link href={href}>
        <Sparkles className="h-4 w-4" aria-hidden />
        {label}
      </Link>
    </Button>
  );
}

export const HOW_IT_WORKS = [
  {
    icon: UserRound,
    name: "Tell us about your child",
    text: "Add their name, age and what they look like, plus a favorite animal, toy or hobby.",
  },
  {
    icon: Palette,
    name: "Pick a story and art style",
    text: "Choose a holiday or everyday adventure and an illustration style they'll love.",
  },
  {
    icon: BookOpen,
    name: "Preview, then download or print",
    text: "See the whole story and every picture before you buy. Get a PDF instantly or a printed book delivered.",
  },
];

export function HowItWorks() {
  return (
    <Section id="how-it-works">
      <SectionHeading title="How it works" subtitle="Three simple steps, about five minutes of your time." />
      <ol className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {HOW_IT_WORKS.map((step, i) => (
          <li key={step.name} className="rounded-2xl border bg-card p-6 text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <step.icon className="h-6 w-6 text-primary" aria-hidden />
            </div>
            <p className="text-sm font-semibold text-primary mb-1">Step {i + 1}</p>
            <h3 className="text-xl font-display font-bold mb-2">{step.name}</h3>
            <p className="text-muted-foreground font-story">{step.text}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

export function ThemeCard({ theme }: { theme: StoryTheme }) {
  return (
    <article className={cn("rounded-2xl border bg-gradient-to-br p-5 flex flex-col", theme.accent)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
        {theme.season === "holiday" ? "Holiday story" : "Everyday adventure"}
      </p>
      <h3 className="text-lg font-display font-bold mb-2">{theme.label.replace("[Name]", "Your Child")}</h3>
      <p className="text-sm font-story text-foreground/80 mb-4 flex-1">{theme.description}</p>
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild size="sm" className="gap-1">
          <Link href={`/create?theme=${theme.id}`}>
            Start this story <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </Button>
        {theme.landingPath && (
          <Link href={theme.landingPath} className="text-sm font-medium text-primary hover:underline">
            Learn more<span className="sr-only"> about {theme.label.replace("[Name]", "your child")}</span>
          </Link>
        )}
      </div>
    </article>
  );
}

export function ThemeGrid({ themes, title, subtitle }: { themes: StoryTheme[]; title: string; subtitle?: string }) {
  return (
    <Section>
      <SectionHeading title={title} subtitle={subtitle} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
        {themes.map((t) => (
          <ThemeCard key={t.id} theme={t} />
        ))}
      </div>
    </Section>
  );
}

/** Page-by-page viewer for a sample book. */
export function SampleBookViewer({ book }: { book: ExampleBook }) {
  const [index, setIndex] = useState(0);
  const page = book.pages[index];
  const label = page.type === "COVER_FRONT" ? "Front cover" : page.type === "COVER_BACK" ? "Back cover" : `Page ${index}`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center max-w-5xl mx-auto">
      <figure className="rounded-2xl overflow-hidden border bg-muted shadow-sm">
        <img
          src={page.image}
          alt={`${book.title}: ${label.toLowerCase()} illustration`}
          width={page.width}
          height={page.height}
          loading={index === 0 ? "eager" : "lazy"}
          decoding="async"
          className="w-full h-auto"
        />
      </figure>
      <div>
        <p className="text-sm font-semibold text-primary mb-2">{label} of {book.pages.length}</p>
        {page.type === "COVER_FRONT" ? (
          <p className="text-2xl font-display font-bold mb-6">{book.title}</p>
        ) : (
          <p className="text-lg font-story leading-relaxed mb-6 min-h-[6rem]">{page.text || "The End"}</p>
        )}
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0} aria-label="Previous page">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setIndex((i) => Math.min(book.pages.length - 1, i + 1))} disabled={index === book.pages.length - 1} aria-label="Next page">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ExampleBookCard({ book }: { book: ExampleBook }) {
  const cover = coverOf(book);
  return (
    <Link href={`/examples/${book.slug}`} className="group block rounded-2xl border bg-card overflow-hidden hover:shadow-lg transition-shadow">
      <img
        src={cover.image}
        alt={`Cover of the example book ${book.title}`}
        width={cover.width}
        height={cover.height}
        loading="lazy"
        decoding="async"
        className="w-full aspect-[3/4] object-cover"
      />
      <div className="p-4">
        <h3 className="font-display font-bold text-lg group-hover:text-primary">{book.title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2 font-story">{book.description}</p>
      </div>
    </Link>
  );
}

export function FaqSection({ faqs, title = "Frequently asked questions" }: { faqs: Faq[]; title?: string }) {
  if (faqs.length === 0) return null;
  return (
    <Section id="faq">
      <SectionHeading title={title} />
      {/* Answers stay in the DOM when collapsed (forceMount) so crawlers read them. */}
      <Accordion type="single" collapsible className="max-w-3xl mx-auto">
        {faqs.map((faq) => (
          <AccordionItem key={faq.question} value={faq.question}>
            <AccordionTrigger className="text-left font-semibold">{faq.question}</AccordionTrigger>
            <AccordionContent forceMount className="font-story text-base text-muted-foreground">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Section>
  );
}

export function PricingCards() {
  const shipping = shippingMethods();
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
      <div className="rounded-2xl border-2 bg-card p-6">
        <div className="flex items-center gap-2 mb-2">
          <Download className="h-5 w-5 text-primary" aria-hidden />
          <h3 className="text-xl font-display font-bold">Digital storybook</h3>
        </div>
        <p className="text-4xl font-bold text-primary mb-1">{formatPrice(digitalPrice())}</p>
        <p className="text-sm text-muted-foreground mb-4">Full-color PDF, ready instantly</p>
        <ul className="space-y-2 text-sm font-story">
          {["Read on any phone, tablet or computer", "Print at home if you like", "The perfect last-minute gift"].map((f) => (
            <li key={f} className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" aria-hidden />{f}</li>
          ))}
        </ul>
      </div>
      <div className="rounded-2xl border-2 border-primary bg-card p-6">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="h-5 w-5 text-primary" aria-hidden />
          <h3 className="text-xl font-display font-bold">Printed storybook</h3>
        </div>
        <p className="text-4xl font-bold text-primary mb-1">
          <span className="text-base font-normal text-muted-foreground">from </span>
          {formatPrice(printPrice(10))}
        </p>
        <p className="text-sm text-muted-foreground mb-4">Printed to order, includes the PDF</p>
        <ul className="space-y-2 text-sm font-story">
          {config.story.pageCounts.map((p) => (
            <li key={p} className="flex justify-between gap-2 border-b border-dashed pb-1">
              <span>{p}-page book</span>
              <span className="font-semibold">{formatPrice(printPrice(p))}</span>
            </li>
          ))}
          {shipping.map((s) => (
            <li key={s.id} className="flex justify-between gap-2 text-muted-foreground">
              <span className="flex items-center gap-1"><Truck className="h-3.5 w-3.5" aria-hidden />{s.label} shipping ({s.minDays}–{s.maxDays} business days)</span>
              <span>{formatPrice(s.price)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
