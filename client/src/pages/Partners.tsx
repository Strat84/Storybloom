import { useEffect, useRef, useState, type ReactNode } from "react";
import { BookHeart, Building2, Check, Church, Copy, GraduationCap, Megaphone, School, Users, Video } from "lucide-react";
import config from "@config";
import { Button } from "@/components/ui/button";
import { FaqSection, PhotoToCartoon, Section, SectionHeading } from "@/components/marketing";
import type { Faq } from "@/content/faq";
import { formatPrice, printPrice } from "@/lib/pricing";
import { track } from "@/lib/track";

const P = config.partners;

/** Plain math from the real price and rates: what a partner earns on one printed book. */
function perBook(pct: number) {
  const paid = printPrice() * (1 - P.customerDiscountPct / 100);
  return formatPrice(Math.round(paid * pct) / 100);
}

interface Audience {
  id: string;
  icon: typeof Users;
  title: string;
  who: string;
  pct: number;
  benefits: string[];
  ask: string;
}

const AUDIENCES: Audience[] = [
  {
    id: "creators",
    icon: Video,
    title: "Parent and family creators, YouTube channels",
    who: "Mom, dad and grandparent creators, bedtime-story and read-aloud channels.",
    pct: P.creatorPct,
    benefits: [
      "A free book starring your child, made with a code we send you",
      `Your own code: your followers get ${P.customerDiscountPct}% off`,
      `You earn ${P.creatorPct}% of every order (about ${perBook(P.creatorPct)} per printed book)`,
      "Content your audience reacts to: their child, illustrated as the hero",
    ],
    ask: "Share your code when it fits your content. Label posts #ad or with your platform's paid-partnership tag.",
  },
  {
    id: "ugc",
    icon: Megaphone,
    title: "UGC creators",
    who: "Creators who film reaction, unboxing and flip-through videos for brands.",
    pct: P.creatorPct,
    benefits: [
      "A free digital book to film, with no upfront commitment",
      `Your own code, and ${P.creatorPct}% of every order it brings in`,
      "With your permission, strong videos may also run as StoryBloom ads",
    ],
    ask: "Film a short video with the book on a tablet or a home-printed copy and send it to us.",
  },
  {
    id: "pta",
    icon: School,
    title: "PTA councils and PTAs",
    who: "PTA councils, PTAs and PTOs looking for an easy fundraiser.",
    pct: P.orgPct,
    benefits: [
      "No selling, no inventory, nothing to collect or deliver",
      `Families get ${P.customerDiscountPct}% off; your PTA earns ${P.orgPct}% of every order`,
      "A ready-to-paste newsletter blurb, so it takes two minutes",
      "Councils: each member PTA can get its own code",
    ],
    ask: "One mention in your newsletter or on social. We never ask for photos of students.",
  },
  {
    id: "churches",
    icon: Church,
    title: "Church children's and family ministries",
    who: "Children's and family ministries that want a meaningful gift idea for families.",
    pct: P.orgPct,
    benefits: [
      `Families get ${P.customerDiscountPct}% off; ${P.orgPct}% of every order supports your children's programs`,
      "A bulletin and family-email blurb, ready to paste",
      "A gift grandparents love: their grandchild as the hero",
    ],
    ask: "Share the code in a bulletin, email or announcement. We never ask for photos of children.",
  },
  {
    id: "parent-groups",
    icon: Users,
    title: "Parent groups, newsletters and local parenting media",
    who: "Parent groups, family-events newsletters, parenting blogs and local parenting sites.",
    pct: P.creatorPct,
    benefits: [
      "A free book to review or give away to a reader",
      `An exclusive ${P.customerDiscountPct}% discount for your members`,
      `You earn ${P.creatorPct}% of every order`,
    ],
    ask: "Feature the book or the code once, in a post, issue or gift guide.",
  },
  {
    id: "schools",
    icon: GraduationCap,
    title: "Preschools and daycares",
    who: "Preschool and daycare groups, single sites and multi-location operators.",
    pct: P.orgPct,
    benefits: [
      "A free class storybook starring your class mascot or a teacher, with no student photos needed",
      `A parent code: families get ${P.customerDiscountPct}% off their own child's book`,
      `${P.orgPct}% of those orders goes back to your school`,
    ],
    ask: "Share the parent code in your newsletter or parent app.",
  },
  {
    id: "businesses",
    icon: Building2,
    title: "Kid-focused businesses",
    who: "Kids' gyms, swim, dance and music schools, pediatric dentists and toy stores.",
    pct: P.orgPct,
    benefits: [
      `An exclusive ${P.customerDiscountPct}% perk for your families`,
      `You earn ${P.orgPct}% of every order, with zero work`,
      "A social post and a short blurb, ready to use",
    ],
    ask: "Share the post or the code with your families once.",
  },
];

const BLURBS = [
  {
    label: "Newsletter blurb (PTAs, churches, schools)",
    text:
      `A holiday gift starring your child: StoryBloom makes a personalized storybook where your child is the illustrated hero. ` +
      `Pick a story, add their name and photo, and preview the whole book free. Use code YOURCODE for ${P.customerDiscountPct}% off, ` +
      `and part of every order supports our programs. storybloom.ai`,
  },
  {
    label: "Social caption (creators)",
    text:
      `We made a storybook where [child] is the hero, and they haven't put it down. You pick the story and art style, add a photo, ` +
      `and StoryBloom writes and illustrates the whole thing. Code YOURCODE takes ${P.customerDiscountPct}% off at storybloom.ai #ad`,
  },
];

const FAQS: Faq[] = [
  {
    question: "How do I join?",
    answer:
      "Use any Join button on this page. It takes a couple of minutes, and we email your partner link and discount code, usually within a day.",
  },
  {
    question: "How does tracking work?",
    answer:
      "Every partner gets their own discount code and link. An order counts for you when the customer uses your code at checkout or arrives through your link.",
  },
  {
    question: "When and how are commissions paid?",
    answer: `Commissions are paid monthly once an order clears a ${P.holdDays}-day hold, so refunds and reprints can settle first. A refunded order doesn't earn a commission.`,
  },
  {
    question: "Is there a reward for partners who sell a lot?",
    answer: `Yes. Once ${P.rewardFirstAt} printed books have shipped with your code, we send you a free printed book, then another for every ${P.rewardEvery} after that.`,
  },
  {
    question: "Do I need to fill out tax forms?",
    answer: "US partners fill out a W-9 before their first payout. Commissions are reported as income.",
  },
  {
    question: "Do I have to disclose the partnership?",
    answer:
      "Yes. The FTC requires it. Label posts #ad or #gifted, or use your platform's paid-partnership tag, whenever you share your code or a book you received free.",
  },
  {
    question: "What about children's photos?",
    answer:
      "We never ask organizations to post or send photos of children. Parents who make a book upload their own child's photo privately, and class books can star a mascot or a teacher instead.",
  },
  {
    question: "Who do I contact?",
    answer: `Email ${config.site.supportEmail} and Matt, StoryBloom's founder, will get back to you.`,
  },
];

const applyHref = (audience: string) =>
  P.applyUrl.startsWith("mailto:") ? `${P.applyUrl}%20(${encodeURIComponent(audience)})` : P.applyUrl;

/** Every sign-up link on the page goes through here, tagged with where it was clicked. */
function ApplyButton({ audience, label = "Join the partner program", variant }: { audience: string; label?: string; variant?: "outline" }) {
  return (
    <Button asChild size="lg" variant={variant} className="text-base px-6">
      <a href={applyHref(audience)} onClick={() => track("partner_apply", { audience })}>{label}</a>
    </Button>
  );
}

function ApplyLink({ audience, children }: { audience: string; children: ReactNode }) {
  return (
    <a className="underline font-semibold text-primary hover:opacity-80" href={applyHref(audience)} onClick={() => track("partner_apply", { audience })}>
      {children}
    </a>
  );
}

function CopyBlock({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h3 className="font-semibold">{label}</h3>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => {
            navigator.clipboard?.writeText(text).then(() => setCopied(true), () => setCopied(false));
          }}
        >
          {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <p className="font-story text-muted-foreground">{text}</p>
    </div>
  );
}

/** Fires a section-view event once per audience section, so we can see which audience the page converts. */
function useSectionViews(ids: string[]) {
  const seen = useRef(new Set<string>());
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting && !seen.current.has(e.target.id)) {
          seen.current.add(e.target.id);
          track("partner_section_view", { audience: e.target.id });
        }
      }
    }, { threshold: 0.5 });
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [ids]);
}

export default function Partners() {
  useSectionViews(AUDIENCES.map((a) => a.id));
  return (
    <>
      <Section className="pb-6">
        <SectionHeading
          as="h1"
          title="Share StoryBloom, earn on every book"
          subtitle="StoryBloom makes personalized storybooks where a child is the illustrated hero. Partners give their audience a discount and earn on every order."
        />
        <div className="flex flex-wrap justify-center gap-3">
          <ApplyButton audience="hero" />
          <Button asChild variant="outline" size="lg" className="text-base px-6">
            <a href="#how-it-works">How it works</a>
          </Button>
        </div>
      </Section>

      <PhotoToCartoon title="One photo becomes the hero of a printed book" subtitle="Parents upload a photo and pick a style; StoryBloom writes and illustrates the story, then prints it." />

      <Section id="how-it-works" className="py-10">
        <SectionHeading title="How it works" />
        <ol className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {[
            ["Sign up", "Takes a couple of minutes. We send your partner link and discount code, usually within a day."],
            ["Get your code and link", `Your audience gets ${P.customerDiscountPct}% off. You get blurbs and captions ready to paste.`],
            ["Earn on every order", `Every partner earns ${P.creatorPct}% of each order for ${P.commissionMonths} months, paid monthly after a ${P.holdDays}-day hold.`],
          ].map(([title, body], i) => (
            <li key={title} className="rounded-2xl border bg-card p-6">
              <div className="text-sm font-semibold text-primary mb-1">Step {i + 1}</div>
              <h3 className="text-xl font-display font-bold mb-2">{title}</h3>
              <p className="font-story text-muted-foreground">{body}</p>
            </li>
          ))}
        </ol>
        <p className="text-center text-sm text-muted-foreground mt-6 max-w-2xl mx-auto">
          <BookHeart className="inline h-4 w-4 text-primary mr-1" aria-hidden />
          Partners who sell get a free printed book once {P.rewardFirstAt} books ship with their code, then one more for every {P.rewardEvery} after that.
          A printed book is {formatPrice(printPrice())} with free US shipping.
        </p>
        <div className="flex justify-center mt-6">
          <ApplyButton audience="how-it-works" label="Sign up free" />
        </div>
      </Section>

      {AUDIENCES.map((a, i) => (
        <Section key={a.id} id={a.id} className={`py-10 scroll-mt-20 ${i % 2 ? "" : "bg-muted/40"} rounded-none`}>
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <a.icon className="h-7 w-7 text-primary shrink-0" aria-hidden />
              <h2 className="text-2xl sm:text-3xl font-display font-bold">{a.title}</h2>
            </div>
            <p className="font-story text-muted-foreground mb-4">{a.who}</p>
            <h3 className="font-semibold mb-2">What you get</h3>
            <ul className="space-y-2 mb-4">
              {a.benefits.map((b) => (
                <li key={b} className="flex gap-2 font-story">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <h3 className="font-semibold mb-1">What we ask</h3>
            <p className="font-story text-muted-foreground mb-5">{a.ask}</p>
            <ApplyButton audience={a.id} label="Join as a partner" />
          </div>
        </Section>
      ))}

      <Section id="join" className="py-10">
        <div className="max-w-3xl mx-auto rounded-2xl bg-primary/10 p-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-display font-bold mb-2">Ready to join?</h2>
          <p className="font-story text-muted-foreground mb-5">
            Free to join, no minimums. Your audience gets {P.customerDiscountPct}% off and you earn {P.creatorPct}% of every order for {P.commissionMonths} months.
          </p>
          <ApplyButton audience="join-band" label="Sign up free" />
        </div>
      </Section>

      <Section id="resources" className="py-10">
        <SectionHeading title="Partner resources" subtitle="Ready to paste. Swap YOURCODE for your own code." />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {BLURBS.map((b) => <CopyBlock key={b.label} label={b.label} text={b.text} />)}
        </div>
        <p className="text-center text-sm text-muted-foreground mt-6">
          Book covers and sample pages to share are on our <a className="underline hover:text-primary" href="/examples">examples page</a>.
          More images are available when you <ApplyLink audience="resources">join the program</ApplyLink>.
        </p>
      </Section>

      <FaqSection faqs={FAQS} title="Partner questions" />

      <Section id="terms" className="py-10">
        <div className="max-w-3xl mx-auto rounded-2xl border bg-card p-6">
          <h2 className="text-2xl font-display font-bold mb-4">Partner terms, in plain language</h2>
          <ul className="space-y-2 font-story text-muted-foreground list-disc pl-5">
            <li>Commissions are {P.creatorPct}% of what the customer pays for the book, before shipping and tax, for every type of partner. You earn on a referred customer's orders for {P.commissionMonths} months from their first order.</li>
            <li>A commission becomes payable {P.holdDays} days after the order. Refunded or charged-back orders don't earn one, and a commission already paid on one is taken off the next payout.</li>
            <li>You must disclose the partnership (#ad, #gifted or your platform's paid-partnership tag) every time you share your code or a book you received free.</li>
            <li>No paid search ads on the StoryBloom name, no coupon-site listings of your code, and no spam or unsolicited messages.</li>
            <li>Only make claims about StoryBloom that are true and on our website.</li>
            <li>StoryBloom may change these terms, remove a partner who breaks them, or end the program, with notice by email. Commissions already earned are still paid.</li>
          </ul>
        </div>
      </Section>

      <Section className="text-center pt-0">
        <ApplyButton audience="footer" />
        <p className="text-sm text-muted-foreground mt-3">
          Questions first? Email <a className="underline" href={`mailto:${config.site.supportEmail}`}>{config.site.supportEmail}</a>.
        </p>
      </Section>
    </>
  );
}
