import { Link } from "wouter";
import { GiftIcon, TruckIcon } from "lucide-react";
import config from "@config";
import { activeCutoff, countdownDays, formatCutoff, holidayPhase } from "@/lib/holiday";
import { useNow } from "@/lib/useNow";

function countdownText(days: number) {
  if (days < 1) {
    const hours = Math.max(1, Math.floor(days * 24));
    return `${hours} hour${hours === 1 ? "" : "s"} left`;
  }
  const whole = Math.floor(days);
  return `${whole} day${whole === 1 ? "" : "s"} left`;
}

/** Site-wide shipping-deadline banner driven by the dates in storybloom.config.ts. */
export default function HolidayBanner() {
  const now = useNow(60_000);
  const phase = holidayPhase(now);
  if (phase === "off") return null;

  const cutoff = activeCutoff(phase);
  const days = countdownDays(phase, now);

  let message: React.ReactNode;
  let Icon = TruckIcon;
  if (phase === "standard" && cutoff) {
    message = (
      <>
        Order printed books by <strong>{formatCutoff(cutoff)}</strong> for Christmas delivery
      </>
    );
  } else if (phase === "expressOnly" && cutoff) {
    message = (
      <>
        Expedited shipping: order by <strong>{formatCutoff(cutoff)}</strong> for Christmas delivery
      </>
    );
  } else {
    Icon = GiftIcon;
    message = config.features.giftCertificates ? (
      <>
        <strong>Instant gift:</strong> give a gift certificate and they'll create their book Christmas morning
      </>
    ) : (
      <>
        <strong>Instant gift:</strong> a digital storybook is ready to give the moment you finish
      </>
    );
  }

  return (
    <div role="region" aria-label="Holiday shipping" className="bg-primary text-primary-foreground">
      <Link
        href="/christmas-book-for-kids"
        className="container mx-auto px-4 sm:px-6 py-2 flex items-center justify-center gap-2 text-xs sm:text-sm text-center"
      >
        <Icon className="hidden sm:block h-4 w-4 shrink-0" aria-hidden />
        <span>{message}</span>
        {days !== null && (
          <span className="rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs font-semibold whitespace-nowrap">
            {countdownText(days)}
          </span>
        )}
        <span className="hidden sm:inline underline underline-offset-2 font-semibold whitespace-nowrap">See holiday books</span>
      </Link>
    </div>
  );
}
