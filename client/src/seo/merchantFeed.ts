import config from "@config";
import { CATALOG, bookForPrerender, coverOf, getHub } from "@/content/catalog";
import { printPrice, shippingMethods } from "@/lib/pricing";

// Google Merchant Center product feed (RSS 2.0), written at build time to /merchant-feed.xml.
// Lists the printed book, the product shoppers see at this price. Custom-made goods have no ISBN,
// hence identifier_exists=no. Titles and descriptions are AI-written, so they use the structured
// attributes Google requires for AI-generated text; images carry the matching IPTC tag.

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const money = (n: number) => `${n.toFixed(2)} ${config.pricing.currency}`;

function aiText(tag: string, text: string) {
  return `<g:${tag}><g:digital_source_type>trained_algorithmic_media</g:digital_source_type><g:content>${esc(text)}</g:content></g:${tag}>`;
}

export function merchantFeedXml() {
  const site = config.site.url;
  const items = CATALOG.map((entry) => {
    const book = bookForPrerender(entry.slug);
    if (!book) return "";
    const hub = getHub(entry.category);
    const low = Number(entry.age_range.split("-")[0]);
    return `    <item>
      <g:id>${entry.slug}-print</g:id>
      ${aiText("structured_title", book.feed_title)}
      ${aiText("structured_description", book.feed_description)}
      <g:link>${site}/books/${entry.slug}</g:link>
      <g:image_link>${site}${coverOf(entry.slug)}</g:image_link>
      <g:availability>in_stock</g:availability>
      <g:price>${money(printPrice())}</g:price>
      <g:brand>${esc(config.site.name)}</g:brand>
      <g:condition>new</g:condition>
      <g:identifier_exists>no</g:identifier_exists>
      <g:google_product_category>784</g:google_product_category>
      <g:product_type>${esc(`Books &gt; Personalized Children's Books &gt; ${hub?.name ?? entry.category}`).replace(/&amp;gt;/g, "&gt;")}</g:product_type>
      <g:age_group>${low <= 1 ? "toddler" : "kids"}</g:age_group>
${shippingMethods().map((m) => `      <g:shipping><g:country>US</g:country><g:service>${esc(m.label)}</g:service><g:price>${money(m.price)}</g:price></g:shipping>`).join("\n")}
    </item>`;
  }).filter(Boolean);
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${esc(config.site.name)} personalized children's books</title>
    <link>${site}/books</link>
    <description>Personalized children's picture books, printed to order.</description>
${items.join("\n")}
  </channel>
</rss>
`;
}
