import config from "@config";

export interface PageMeta {
  /** Path without trailing slash, e.g. "/pricing". */
  path: string;
  /** Full <title>. Keep under ~60 characters. */
  title: string;
  /** Meta description. Keep around 140–160 characters. */
  description: string;
  /** Absolute path or URL of the 1200×630 share image. */
  ogImage?: string;
  ogImageAlt?: string;
  ogType?: "website" | "article" | "product" | "book";
  noindex?: boolean;
  jsonLd?: Record<string, unknown>[];
}

export const DEFAULT_OG_IMAGE = "/og/storybloom-share.jpg";

export function absoluteUrl(pathOrUrl: string) {
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  const path = pathOrUrl === "/" ? "" : pathOrUrl;
  return `${config.site.url}${path}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** JSON-LD must not contain "</script>". */
function safeJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

interface HeadTag {
  tag: "meta" | "link";
  attrs: Record<string, string>;
}

function headTags(meta: PageMeta): HeadTag[] {
  const url = absoluteUrl(meta.path);
  const image = absoluteUrl(meta.ogImage ?? DEFAULT_OG_IMAGE);
  const tags: HeadTag[] = [
    { tag: "meta", attrs: { name: "description", content: meta.description } },
    { tag: "meta", attrs: { name: "robots", content: meta.noindex ? "noindex, follow" : "index, follow, max-image-preview:large" } },
    { tag: "meta", attrs: { property: "og:site_name", content: config.site.name } },
    { tag: "meta", attrs: { property: "og:type", content: meta.ogType ?? "website" } },
    { tag: "meta", attrs: { property: "og:title", content: meta.title } },
    { tag: "meta", attrs: { property: "og:description", content: meta.description } },
    { tag: "meta", attrs: { property: "og:url", content: url } },
    { tag: "meta", attrs: { property: "og:image", content: image } },
    { tag: "meta", attrs: { property: "og:image:width", content: "1200" } },
    { tag: "meta", attrs: { property: "og:image:height", content: "630" } },
    { tag: "meta", attrs: { property: "og:image:alt", content: meta.ogImageAlt ?? meta.title } },
    { tag: "meta", attrs: { property: "og:locale", content: "en_US" } },
    { tag: "meta", attrs: { name: "twitter:card", content: "summary_large_image" } },
    { tag: "meta", attrs: { name: "twitter:title", content: meta.title } },
    { tag: "meta", attrs: { name: "twitter:description", content: meta.description } },
    { tag: "meta", attrs: { name: "twitter:image", content: image } },
  ];
  if (!meta.noindex) tags.push({ tag: "link", attrs: { rel: "canonical", href: url } });
  return tags;
}

/** Head markup for prerendered HTML. Every managed tag carries data-sb so the client can replace it. */
export function renderHead(meta: PageMeta) {
  const lines = [`<title>${escapeHtml(meta.title)}</title>`];
  for (const { tag, attrs } of headTags(meta)) {
    const attrText = Object.entries(attrs)
      .map(([k, v]) => `${k}="${escapeHtml(v)}"`)
      .join(" ");
    lines.push(`<${tag} data-sb ${attrText}>`);
  }
  for (const block of meta.jsonLd ?? []) {
    lines.push(`<script type="application/ld+json" data-sb>${safeJson(block)}</script>`);
  }
  return lines.join("\n    ");
}

/** Update the document head after client-side navigation. */
export function applyHead(meta: PageMeta) {
  document.title = meta.title;
  document.head.querySelectorAll("[data-sb]").forEach((el) => el.remove());
  for (const { tag, attrs } of headTags(meta)) {
    const el = document.createElement(tag);
    el.setAttribute("data-sb", "");
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    document.head.appendChild(el);
  }
  for (const block of meta.jsonLd ?? []) {
    const el = document.createElement("script");
    el.type = "application/ld+json";
    el.setAttribute("data-sb", "");
    el.textContent = JSON.stringify(block);
    document.head.appendChild(el);
  }
}

// ---- Structured data builders (schema.org) ----

export function organizationLd() {
  const sameAs = Object.values(config.site.social).filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${config.site.url}/#organization`,
    name: config.site.name,
    url: config.site.url,
    logo: absoluteUrl("/favicon.png"),
    email: config.site.supportEmail,
    ...(sameAs.length ? { sameAs } : {}),
  };
}

export function websiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${config.site.url}/#website`,
    name: config.site.name,
    url: config.site.url,
    publisher: { "@id": `${config.site.url}/#organization` },
  };
}

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function faqLd(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

export interface ProductOfferInput {
  name: string;
  price: number;
  sku: string;
}

/**
 * Product with real offers. No aggregateRating or review until real, verified reviews
 * exist (and then only from those).
 */
export function productLd({
  name,
  description,
  image,
  path,
  offers,
}: {
  name: string;
  description: string;
  image: string;
  path: string;
  offers: ProductOfferInput[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    image: absoluteUrl(image),
    brand: { "@type": "Brand", name: config.site.name },
    url: absoluteUrl(path),
    offers: offers.map((o) => ({
      "@type": "Offer",
      name: o.name,
      sku: o.sku,
      price: o.price.toFixed(2),
      priceCurrency: config.pricing.currency,
      availability: "https://schema.org/InStock",
      url: absoluteUrl(path),
      seller: { "@id": `${config.site.url}/#organization` },
    })),
  };
}

export function howToLd(name: string, steps: { name: string; text: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    step: steps.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.name, text: s.text })),
  };
}
