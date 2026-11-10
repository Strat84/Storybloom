import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, Lock, Minus, Plus, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import config, { type ShippingMethod } from "@config";
import { extraCopyPrice, formatDeliveryWindow, formatPrice, printPrice, shippingMethods, type PrintPageCount } from "@/lib/pricing";
import { printArrivesAfterChristmas } from "@/lib/holiday";
import { cn } from "@/lib/utils";
import { withOffer } from "@/lib/checkout";

/**
 * A printed-book order. Express orders (the only kind this dialog makes now) leave the address,
 * phone and shipping speed to Stripe's checkout page, where Apple Pay / Google Pay fill them in.
 */
export interface PrintOrder {
  storyId: string;
  pageCount: PrintPageCount;
  copies: number;
  /** Books only (after any PDF credit and offer); shipping is added on Stripe's page. */
  totalPrice: number;
  shipping?: ShippingMethod["id"];
}

interface PrintOrderDialogProps {
  open: boolean;
  storyId: string | null;
  storyTitle: string;
  pageCount: PrintPageCount;
  onClose: () => void;
  onCheckout: (order: PrintOrder) => Promise<void>;
  /** Already paid for this story's PDF; the backend credits it toward the printed book. */
  pdfCredit?: number;
  /** Every page, shown small for a last look before paying. */
  proofPages?: ProofPage[];
  /** Show the "PREVIEW" mark on proof pages (book not purchased yet). */
  watermark?: boolean;
  /** Close the order and open the page editor. */
  onEditPages?: () => void;
  /** The follow-up email's discount on this book, in percent (applied by the backend too). */
  offerPct?: number;
  /** Funnel events (proof_open, proof_confirm, checkout_start, checkout_error). */
  onEvent?: (name: "proof_open" | "proof_confirm" | "checkout_start" | "checkout_error") => void;
}

export interface ProofPage {
  imageUrl: string | null;
  text: string;
  label: string;
  locked?: boolean;
}

export default function PrintOrderDialog({ open, storyId, storyTitle, pageCount, onClose, onCheckout, pdfCredit = 0, proofPages = [], onEditPages, offerPct, onEvent }: PrintOrderDialogProps) {
  const { toast } = useToast();
  const [approved, setApproved] = useState(false);
  const [copies, setCopies] = useState(1);
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState<number | null>(null);
  const now = new Date();

  useEffect(() => {
    if (open) {
      setApproved(false);
      setZoom(null);
      onEvent?.("proof_open");
    }
    // Only when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const bookPrice = printPrice(pageCount);
  const extraCopies = (copies - 1) * extraCopyPrice();
  const credit = Math.min(pdfCredit, bookPrice);
  // Mirrors the backend (services/pricing.js, services/offer.js), which computes the amount actually charged.
  const books = Math.round((bookPrice + extraCopies - credit) * 100) / 100;
  const offerSaving = offerPct ? Math.round((books - withOffer(books, offerPct)) * 100) / 100 : 0;
  const total = Math.round((books - offerSaving) * 100) / 100;
  const standardLate = printArrivesAfterChristmas("standard", now);
  const fastest = shippingMethods()[shippingMethods().length - 1];
  const fastestLate = printArrivesAfterChristmas(fastest.id, now);

  const checkout = async () => {
    if (!storyId || !approved) return;
    setBusy(true);
    onEvent?.("checkout_start");
    try {
      await onCheckout({ storyId, pageCount, copies, totalPrice: total });
    } catch {
      onEvent?.("checkout_error");
      toast({ title: "Checkout error", description: "Something went wrong starting the payment. Please try again.", variant: "destructive" });
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-lg max-h-[92dvh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Order your printed book</DialogTitle>
          <DialogDescription dir="auto">{storyTitle}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">A last look: it's printed exactly like this</p>
            <div className="grid grid-cols-4 gap-1.5" data-clarity-mask="true">
              {proofPages.map((pg, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setZoom(zoom === i ? null : i)}
                  className={cn("relative aspect-[3/4] rounded-md overflow-hidden border bg-muted", zoom === i && "ring-2 ring-primary")}
                  aria-label={`${pg.label}${pg.locked ? " (opens when you buy)" : ""}`}
                >
                  {pg.imageUrl ? (
                    <img src={pg.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" draggable={false} />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-muted-foreground">{pg.locked ? <Lock className="h-4 w-4" /> : null}</span>
                  )}
                  <span className="absolute bottom-0 inset-x-0 bg-black/45 text-white text-[10px] leading-4 text-center">{pg.label.replace("Page ", "p")}</span>
                </button>
              ))}
            </div>
            {zoom !== null && proofPages[zoom] && (
              <div className="mt-2 rounded-lg border p-2 flex gap-3 items-start" data-clarity-mask="true">
                {proofPages[zoom].imageUrl && <img src={proofPages[zoom].imageUrl!} alt="" className="w-28 rounded-md shrink-0" draggable={false} />}
                <p dir="auto" className="text-sm font-story whitespace-pre-line max-h-40 overflow-y-auto">{proofPages[zoom].text || proofPages[zoom].label}</p>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">Tap a page to see it bigger. Want to change something? {onEditPages && <button type="button" className="underline text-primary" onClick={onEditPages}>Edit a page first</button>}</p>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div>
              <p className="font-medium">Copies</p>
              <p className="text-sm text-muted-foreground">Extra copies {formatPrice(extraCopyPrice())} each, great for grandparents</p>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="icon" aria-label="One fewer copy" disabled={copies <= 1} onClick={() => setCopies((c) => Math.max(1, c - 1))}><Minus className="h-4 w-4" /></Button>
              <span className="w-6 text-center font-semibold" aria-live="polite">{copies}</span>
              <Button type="button" variant="outline" size="icon" aria-label="One more copy" disabled={copies >= config.pricing.maxCopies} onClick={() => setCopies((c) => Math.min(config.pricing.maxCopies, c + 1))}><Plus className="h-4 w-4" /></Button>
            </div>
          </div>

          <dl className="text-sm space-y-1.5">
            <div className="flex justify-between"><dt>Printed book</dt><dd>{formatPrice(bookPrice)}</dd></div>
            {copies > 1 && <div className="flex justify-between"><dt>{copies - 1} extra {copies === 2 ? "copy" : "copies"}</dt><dd>{formatPrice(extraCopies)}</dd></div>}
            {credit > 0 && <div className="flex justify-between text-primary"><dt>Credit for the PDF you already bought</dt><dd>−{formatPrice(credit)}</dd></div>}
            {offerSaving > 0 && <div className="flex justify-between text-primary"><dt>{offerPct}% off (your offer)</dt><dd>−{formatPrice(offerSaving)}</dd></div>}
            <div className="flex justify-between"><dt>Standard shipping</dt><dd>Free</dd></div>
            <div className="flex justify-between border-t pt-2 font-semibold text-base"><dt>Total</dt><dd>{formatPrice(total)}</dd></div>
          </dl>
          <p className="text-xs text-muted-foreground -mt-2">
            Standard arrives {formatDeliveryWindow("standard", now)}. Faster shipping is offered on the next screen.
          </p>
          {standardLate && (
            <p className="text-xs font-medium text-amber-700 flex items-start gap-1 -mt-2">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden />
              Standard may not arrive by December 25.{fastestLate ? "" : ` Choose ${fastest.label.toLowerCase()} shipping on the next screen for Christmas.`}
            </p>
          )}

          <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer">
            <input type="checkbox" className="mt-1 h-4 w-4" checked={approved} onChange={(e) => { setApproved(e.target.checked); if (e.target.checked) onEvent?.("proof_confirm"); }} />
            <span className="text-sm">The pages look right. Please print my book as shown.</span>
          </label>
          <Button size="lg" className="w-full" onClick={checkout} disabled={busy || !approved}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}Continue to secure checkout
          </Button>
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5 text-center">
            <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden />Apple Pay, Google Pay or card. Your address goes on the next screen (US only).
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
