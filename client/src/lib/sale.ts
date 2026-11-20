import config from "@config";

export interface Sale {
  pct: number;
  /** "Black Friday" or "Cyber Monday", by day. */
  name: string;
  endsAt: number;
}

/** The Black Friday – Cyber Monday sale on printed books, if it's on at `now` (storybloom.config.ts). */
export function activeSale(now: Date | number = Date.now()): Sale | null {
  const t = typeof now === "number" ? now : now.getTime();
  const { pct, startsAt, cyberMondayAt, endsAt } = config.sale;
  const start = Date.parse(startsAt);
  const end = Date.parse(endsAt);
  if (!(t >= start && t < end)) return null;
  return { pct, name: t >= Date.parse(cyberMondayAt) ? "Cyber Monday" : "Black Friday", endsAt: end };
}

/** "2d 14h", "5h 03m", "12m 40s": time left in the sale. */
export function saleTimeLeft(endsAt: number, now: number) {
  const s = Math.max(0, Math.floor((endsAt - now) / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  if (d > 0) return `${d}d ${h}h ${pad(m)}m`;
  if (h > 0) return `${h}h ${pad(m)}m ${pad(s % 60)}s`;
  return `${m}m ${pad(s % 60)}s`;
}
