import { lazy, type ComponentType } from "react";
import config from "@config";
import Home from "@/pages/Home";
import Create from "@/pages/Create";
import { Redirect } from "wouter";
import Pricing from "@/pages/Pricing";
import { Examples, ExampleBookPage } from "@/pages/Examples";
import Landing, { landingFaqs } from "@/pages/Landing";
import FaqPage, { allFaqs } from "@/pages/FaqPage";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import { SignIn, SignUp, ForgotPassword, CreateNewPassword } from "@/pages/auth";
import { enabledLandingPages, type LandingPage } from "@/content/landing";
import { EXAMPLE_BOOKS, coverOf, getExample } from "@/content/examples";
import { digitalPrice, printPrice } from "@/lib/pricing";
import {
  breadcrumbLd,
  faqLd,
  organizationLd,
  productLd,
  websiteLd,
  type PageMeta,
} from "@/seo/seo";

// Logged-in pages are never prerendered, so they load on demand to keep the
// marketing pages' JavaScript small.
const GeneratedStory = lazy(() => import("@/pages/GeneratedStory"));
const MyStories = lazy(() => import("@/pages/MyStories"));
const Profile = lazy(() => import("@/pages/Profile"));
const Book = lazy(() => import("@/pages/Book"));

export interface RouteDef {
  /** wouter pattern */
  path: string;
  component: ComponentType;
  access?: "protected" | "publicOnly";
}

export interface SitemapEntry {
  path: string;
  priority: number;
  changefreq: "daily" | "weekly" | "monthly" | "yearly";
}

const SITE = config.site.name;

function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

function offers() {
  return [
    { name: "Digital storybook (PDF)", price: digitalPrice(), sku: "digital-pdf" },
    { name: "Printed storybook (free standard shipping)", price: printPrice(), sku: "print-softcover" },
  ];
}

function bookProductLd(path: string, name: string, description: string, image = "/og/storybloom-share.jpg") {
  return productLd({ name, description, image, path, offers: offers() });
}

function landingMeta(page: LandingPage): PageMeta {
  return {
    path: page.path,
    title: page.metaTitle,
    description: page.metaDescription,
    jsonLd: [
      breadcrumbLd([{ name: "Home", path: "/" }, { name: page.breadcrumb, path: page.path }]),
      bookProductLd(page.path, page.h1, page.metaDescription),
      faqLd(landingFaqs(page)),
    ],
  };
}

const noindex = (path: string, title: string): PageMeta => ({
  path,
  title: `${title} | ${SITE}`,
  description: "Create personalized storybooks starring your child with StoryBloom.",
  noindex: true,
});

/** Static page metadata, keyed by exact path. */
const STATIC_META: Record<string, PageMeta> = {
  "/": {
    path: "/",
    title: "StoryBloom | Personalized Storybooks Starring Your Child",
    description:
      "Turn a photo of your child into the illustrated hero of their own picture book, with the whole family and pets, in 21 languages. Preview free, then download or order a printed book.",
    jsonLd: [
      organizationLd(),
      websiteLd(),
      bookProductLd("/", "Personalized children's storybook", "A picture book written and illustrated around your child, available as a digital PDF or printed book."),
    ],
  },
  "/create": {
    path: "/create",
    title: `Create a Personalized Storybook | ${SITE}`,
    description:
      "Make a personalized storybook in about five minutes: add your child's name and look, pick a story and art style, and preview the whole book free.",
  },
  "/pricing": {
    path: "/pricing",
    title: `Pricing & Shipping for Personalized Books | ${SITE}`,
    description:
      "Creating and previewing is free. Digital PDF storybooks and printed books made to order with free standard shipping across the US.",
    jsonLd: [
      breadcrumbLd([{ name: "Home", path: "/" }, { name: "Pricing", path: "/pricing" }]),
      bookProductLd("/pricing", "Personalized children's storybook", "A picture book written and illustrated around your child."),
    ],
  },
  "/examples": {
    path: "/examples",
    title: `Example Personalized Storybooks | ${SITE}`,
    description: "Flip through real personalized children's books made with StoryBloom, page by page, then make one starring your child.",
    jsonLd: [breadcrumbLd([{ name: "Home", path: "/" }, { name: "Examples", path: "/examples" }])],
  },
  "/faq": {
    path: "/faq",
    title: `FAQ: Personalized Children's Books | ${SITE}`,
    description: "Answers about making, pricing, shipping and editing StoryBloom personalized storybooks for kids.",
    jsonLd: [breadcrumbLd([{ name: "Home", path: "/" }, { name: "FAQ", path: "/faq" }]), faqLd(allFaqs())],
  },
  "/terms": {
    path: "/terms",
    title: `Terms of Service | ${SITE}`,
    description: "The terms that apply when you use StoryBloom to create, download and order personalized storybooks.",
  },
  "/privacy": {
    path: "/privacy",
    title: `Privacy Policy | ${SITE}`,
    description: "How StoryBloom collects, uses and protects your information and your child's.",
  },
  "/signin": noindex("/signin", "Sign in"),
  "/signup": noindex("/signup", "Create your account"),
  "/forgot-password": noindex("/forgot-password", "Reset your password"),
  "/create-new-password": noindex("/create-new-password", "Create a new password"),
  "/mystories": noindex("/mystories", "My Stories"),
  "/profile": noindex("/profile", "Your account"),
};

for (const page of enabledLandingPages()) STATIC_META[page.path] = landingMeta(page);

export const NOT_FOUND_META: PageMeta = {
  path: "/404",
  title: `Page not found | ${SITE}`,
  description: "This page doesn't exist. Create a personalized storybook starring your child with StoryBloom.",
  noindex: true,
};

/** Metadata for any concrete path, including dynamic ones. */
export function pageMetaFor(path: string): PageMeta {
  const clean = path.length > 1 ? path.replace(/\/+$/, "") : path;
  if (STATIC_META[clean]) return STATIC_META[clean];

  const example = clean.match(/^\/examples\/([^/]+)$/);
  if (example) {
    const book = getExample(example[1]);
    if (book) {
      const cover = coverOf(book);
      const firstPage = book.pages.find((p) => p.type === "PAGE")?.text ?? "";
      return {
        path: clean,
        title: `${book.title} | Example Kids' Storybook`,
        description: truncate(`Read "${book.title}", an example children's picture book made with StoryBloom. ${firstPage}`, 158),
        ogImage: `/og/examples/${book.slug}.jpg`,
        ogImageAlt: `Cover of ${book.title}`,
        ogType: "book",
        jsonLd: [
          breadcrumbLd([{ name: "Home", path: "/" }, { name: "Examples", path: "/examples" }, { name: book.title, path: clean }]),
          {
            "@context": "https://schema.org",
            "@type": "Book",
            name: book.title,
            image: `${config.site.url}${cover.image}`,
            url: `${config.site.url}${clean}`,
            inLanguage: "en",
            audience: { "@type": "PeopleAudience", suggestedMinAge: 3, suggestedMaxAge: 9 },
            publisher: { "@id": `${config.site.url}/#organization` },
          },
        ],
      };
    }
  }
  if (clean.startsWith("/generated-story")) return noindex(clean, "Your story");
  if (clean.startsWith("/book/")) return noindex(clean, "Your book");
  return NOT_FOUND_META;
}

export const ROUTES: RouteDef[] = [
  { path: "/", component: Home },
  { path: "/create", component: Create },
  // "Write your own story" now lives inside the wizard.
  { path: "/create/custom", component: () => <Redirect to="/create?mode=custom" replace /> },
  { path: "/pricing", component: Pricing },
  { path: "/examples", component: Examples },
  { path: "/examples/:slug", component: ExampleBookPage },
  { path: "/faq", component: FaqPage },
  { path: "/terms", component: Terms },
  { path: "/privacy", component: Privacy },
  ...enabledLandingPages().map((page) => ({ path: page.path, component: () => <Landing page={page} /> })),
  { path: "/signin", component: SignIn, access: "publicOnly" },
  { path: "/signup", component: SignUp, access: "publicOnly" },
  { path: "/forgot-password", component: ForgotPassword, access: "publicOnly" },
  { path: "/create-new-password", component: CreateNewPassword, access: "publicOnly" },
  { path: "/generated-story/:storyId", component: GeneratedStory, access: "protected" },
  { path: "/book/:storyId", component: Book, access: "protected" },
  { path: "/mystories", component: MyStories, access: "protected" },
  { path: "/profile", component: Profile, access: "protected" },
];

/** Public pages that are prerendered to static HTML and listed in the sitemap. */
export const SITEMAP: SitemapEntry[] = [
  { path: "/", priority: 1.0, changefreq: "weekly" },
  { path: "/create", priority: 0.9, changefreq: "monthly" },
  ...enabledLandingPages().map((p) => ({ path: p.path, priority: 0.9, changefreq: "weekly" as const })),
  { path: "/examples", priority: 0.7, changefreq: "monthly" },
  ...EXAMPLE_BOOKS.map((b) => ({ path: `/examples/${b.slug}`, priority: 0.6, changefreq: "monthly" as const })),
  { path: "/pricing", priority: 0.8, changefreq: "monthly" },
  { path: "/faq", priority: 0.6, changefreq: "monthly" },
  { path: "/privacy", priority: 0.2, changefreq: "yearly" },
  { path: "/terms", priority: 0.2, changefreq: "yearly" },
];

/** Prerendered but not in the sitemap (noindex app entry points). */
export const PRERENDER_ONLY = ["/signin", "/signup", "/forgot-password", "/create-new-password"];

/** Path prefixes served by the client-only app shell (see scripts/amplify-rules.mjs). */
export const APP_SHELL_PREFIXES = ["/generated-story", "/book", "/mystories", "/profile"];
