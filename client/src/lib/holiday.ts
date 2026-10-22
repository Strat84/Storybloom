import config, { type ShippingMethod } from "@config";

/**
 * Where we are relative to the holiday shipping cutoffs.
 *
 * - standard:     standard shipping still arrives by Christmas
 * - expressOnly:  standard cutoff passed; express still arrives by Christmas
 * - instantGift:  express cutoff passed; lead with digital / gift certificate
 * - off:          banner disabled or the season is over
 */
export type HolidayPhase = "standard" | "expressOnly" | "instantGift" | "off";

/** Cutoff dates are the last day to order, so they run until end of day. */
function endOfDay(isoDate: string) {
  return new Date(`${isoDate}T23:59:59`);
}

/** Whether to feature holiday stories at all (independent of shipping dates). */
export function isHolidaySeason(now: Date) {
  return config.holiday.seasonActive && now <= endOfDay(config.holiday.bannerEndDate);
}

/** Shipping-deadline phase. "off" until both cutoff dates are set in the config. */
export function holidayPhase(now: Date): HolidayPhase {
  const h = config.holiday;
  if (!h.bannerEnabled || !h.printCutoffDate || !h.expressCutoffDate || now > endOfDay(h.bannerEndDate)) return "off";
  if (now <= endOfDay(h.printCutoffDate)) return "standard";
  if (now <= endOfDay(h.expressCutoffDate)) return "expressOnly";
  return "instantGift";
}

export function activeCutoff(phase: HolidayPhase) {
  const { printCutoffDate, expressCutoffDate } = config.holiday;
  if (phase === "standard" && printCutoffDate) return endOfDay(printCutoffDate);
  if (phase === "expressOnly" && expressCutoffDate) return endOfDay(expressCutoffDate);
  return null;
}

export function formatCutoff(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Days until the cutoff, or null if outside the countdown window. */
export function countdownDays(phase: HolidayPhase, now: Date) {
  const cutoff = activeCutoff(phase);
  if (!cutoff) return null;
  const ms = cutoff.getTime() - now.getTime();
  const days = ms / (1000 * 60 * 60 * 24);
  return days <= config.holiday.countdownDays ? Math.max(0, days) : null;
}

/** True when a print order placed now (with this method) should be labeled "arrives after Christmas". */
export function printArrivesAfterChristmas(methodId: ShippingMethod["id"], now: Date) {
  const cutoff = methodId === "standard" ? config.holiday.printCutoffDate : config.holiday.expressCutoffDate;
  if (!cutoff) return false;
  return now > endOfDay(cutoff) && now < endOfDay(config.holiday.bannerEndDate);
}
