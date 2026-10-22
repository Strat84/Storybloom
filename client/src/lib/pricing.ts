import config, { type ShippingMethod } from "@config";

export type PrintPageCount = 10 | 15 | 20;

export function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: config.pricing.currency,
  }).format(amount);
}

/** Digital PDF price. */
export function digitalPrice() {
  return config.pricing.digitalPdf;
}

/** Printed book price (the same for every length; standard shipping included). */
export function printPrice(_pages?: PrintPageCount) {
  return config.pricing.printBook;
}

/** Lowest printed-book price, for "from $X" copy and structured data. */
export function lowestPrintPrice() {
  return config.pricing.printBook;
}

export function extraCopyPrice() {
  return config.pricing.extraCopy;
}

export function shippingMethods(): ShippingMethod[] {
  return config.pricing.shipping;
}

export function shippingMethod(id: ShippingMethod["id"]) {
  const method = config.pricing.shipping.find((m) => m.id === id);
  if (!method) throw new Error(`Unknown shipping method: ${id}`);
  return method;
}

/** Story page count includes front and back covers; print sizes count interior pages. */
export function printTierForStory(totalPages: number): PrintPageCount {
  const interior = Math.max(1, totalPages - 2);
  if (interior <= 10) return 10;
  if (interior <= 15) return 15;
  return 20;
}

function addBusinessDays(from: Date, days: number) {
  const date = new Date(from);
  let added = 0;
  while (added < days) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return date;
}

/** Estimated delivery window for a shipping method ordered on `orderDate`. */
export function estimatedDelivery(methodId: ShippingMethod["id"], orderDate = new Date()) {
  const method = shippingMethod(methodId);
  return {
    earliest: addBusinessDays(orderDate, method.minDays),
    latest: addBusinessDays(orderDate, method.maxDays),
  };
}

export function formatShortDate(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatDeliveryWindow(methodId: ShippingMethod["id"], orderDate = new Date()) {
  const { earliest, latest } = estimatedDelivery(methodId, orderDate);
  return `${formatShortDate(earliest)} – ${formatShortDate(latest)}`;
}
