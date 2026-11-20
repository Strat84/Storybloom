import { Link } from "wouter";
import { ArrowRight, Tag } from "lucide-react";
import { activeSale, saleTimeLeft } from "@/lib/sale";
import { useNow } from "@/lib/useNow";

/** Site-wide Black Friday – Cyber Monday banner. Shows only while the sale is on (storybloom.config.ts, `sale`). */
export default function SaleBanner() {
  const now = useNow(1000);
  const sale = activeSale(now);
  if (!sale) return null;

  return (
    <div role="region" aria-label={`${sale.name} sale`} className="bg-neutral-950 text-white">
      <Link
        href="/create"
        className="group container mx-auto px-3 sm:px-6 py-2 sm:py-2.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center"
      >
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-400 text-neutral-950 px-2 py-0.5 text-[11px] sm:text-xs font-extrabold uppercase tracking-wider">
          <Tag className="h-3 w-3" aria-hidden />{sale.name}
        </span>
        <span className="text-sm sm:text-base font-bold">
          <span className="text-amber-300">{sale.pct}% off</span> every printed book
        </span>
        <span className="text-xs sm:text-sm text-white/75 tabular-nums">
          Ends in <span className="font-semibold text-white">{saleTimeLeft(sale.endsAt, now.getTime())}</span>
        </span>
        <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-amber-400 text-neutral-950 px-3 py-0.5 text-sm font-bold group-hover:bg-amber-300">
          Create your book <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </span>
      </Link>
    </div>
  );
}
