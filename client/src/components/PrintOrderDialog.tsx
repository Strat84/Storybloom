import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, Minus, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import config, { type ShippingMethod } from "@config";
import { extraCopyPrice, formatDeliveryWindow, formatPrice, printPrice, shippingMethod, shippingMethods, type PrintPageCount } from "@/lib/pricing";
import { printArrivesAfterChristmas } from "@/lib/holiday";
import { US_STATES } from "@/lib/usStates";
import { cn } from "@/lib/utils";
import PreviewWatermark from "@/components/PreviewWatermark";

/** Lulu print package used by the live site: 8.5x11, premium full color, saddle-stitched, 80# coated paper. */
const POD_PACKAGE_ID = "0850X1100FCPRESS080CW444GXX";

export interface ShippingAddress {
  name: string;
  street1: string;
  street2: string;
  city: string;
  state_code: string;
  postcode: string;
  country_code: "US";
  phone_number: string;
}

export interface PrintOrder {
  storyId: string;
  pageCount: PrintPageCount;
  shipping: ShippingMethod["id"];
  copies: number;
  address: ShippingAddress;
  bookPrice: number;
  shippingPrice: number;
  totalPrice: number;
}

const EMPTY_ADDRESS: ShippingAddress = {
  name: "",
  street1: "",
  street2: "",
  city: "",
  state_code: "",
  postcode: "",
  country_code: "US",
  phone_number: "",
};

function formatPhone(digits: string) {
  if (digits.length <= 3) return digits ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
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
  /** Every page, shown as a final proof the buyer approves before paying. */
  proofPages?: ProofPage[];
  /** Show the "PREVIEW" watermark on proof pages (book not purchased yet). */
  watermark?: boolean;
  /** Close the order and open the page editor. */
  onEditPages?: () => void;
}

export interface ProofPage {
  imageUrl: string | null;
  text: string;
  label: string;
}

export default function PrintOrderDialog({ open, storyId, storyTitle, pageCount, onClose, onCheckout, pdfCredit = 0, proofPages = [], watermark = false, onEditPages }: PrintOrderDialogProps) {
  const { toast } = useToast();
  // 0: proof every page, 1: shipping, 2: summary
  const [step, setStep] = useState<0 | 1 | 2>(1);
  const [approved, setApproved] = useState(false);
  const [address, setAddress] = useState<ShippingAddress>(EMPTY_ADDRESS);
  const [shipping, setShipping] = useState<ShippingMethod["id"]>("standard");
  const [copies, setCopies] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const now = new Date();

  useEffect(() => {
    if (open) {
      setStep(proofPages.length ? 0 : 1);
      setApproved(false);
      setError(null);
    }
    // Only reset when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (patch: Partial<ShippingAddress>) => setAddress((a) => ({ ...a, ...patch }));
  const bookPrice = printPrice(pageCount);
  const method = shippingMethod(shipping);
  const shippingPrice = method.price;
  const extraCopies = (copies - 1) * extraCopyPrice();
  const credit = Math.min(pdfCredit, bookPrice);
  // Mirrors the backend (services/pricing.js), which computes the amount actually charged.
  const total = Math.round((bookPrice + extraCopies - credit + shippingPrice) * 100) / 100;

  const complete =
    address.name.trim() && address.street1.trim() && address.city.trim() && address.state_code && address.postcode.length === 5 && address.phone_number.length === 10;
  // Lulu limits each street line to 30 characters, not counting spaces.
  const streetTooLong = [address.street1, address.street2].some((s) => s.replace(/\s/g, "").length > 30);

  const validate = async () => {
    if (!complete) {
      setError("Please fill in every required field. ZIP must be 5 digits and phone 10 digits.");
      return;
    }
    if (streetTooLong) {
      setError("Each street line can be at most 30 characters (not counting spaces). Try abbreviations like St, Ave or Apt.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api<any>("/lulu/address-validate", {
        method: "POST",
        body: {
          line_items: [{ page_count: pageCount, pod_package_id: POD_PACKAGE_ID, quantity: copies }],
          shipping_address: {
            city: address.city.trim(),
            country_code: address.country_code,
            postcode: address.postcode,
            state_code: address.state_code || null,
            street1: address.street1.trim(),
            ...(address.street2.trim() ? { street2: address.street2.trim() } : {}),
            phone_number: address.phone_number,
          },
          shipping_option: method.luluLevel,
        },
      });
      if (!res?.success) {
        setError(res?.message || "We couldn't verify that address. Please check it and try again.");
        return;
      }
      setStep(2);
    } catch {
      setError("Something went wrong verifying the address. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const checkout = async () => {
    if (!storyId) return;
    setBusy(true);
    try {
      await onCheckout({ storyId, pageCount, shipping, copies, address, bookPrice, shippingPrice, totalPrice: total });
    } catch {
      toast({ title: "Checkout error", description: "Something went wrong starting the payment.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{step === 0 ? "Check your book before it's printed" : step === 1 ? "Order your printed book" : "Order summary"}</DialogTitle>
          <DialogDescription>{storyTitle}</DialogDescription>
        </DialogHeader>

        {step === 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Your book will be printed exactly like this. Scroll through every page and check the words and pictures.</p>
            <ol className="space-y-5">
              {proofPages.map((pg, i) => (
                <li key={i} className="space-y-2">
                  <p className="text-xs font-semibold text-primary">{pg.label}</p>
                  <div className="relative rounded-lg overflow-hidden border bg-muted aspect-[3/4] max-w-[280px]">
                    {pg.imageUrl && <img src={pg.imageUrl} alt={`${pg.label} proof`} className="w-full h-full object-cover" loading="lazy" draggable={false} onContextMenu={(e) => watermark && e.preventDefault()} />}
                    {watermark && i > 0 && <PreviewWatermark label="PROOF" />}
                  </div>
                  {pg.text && <p className="text-sm font-story whitespace-pre-line">{pg.text}</p>}
                </li>
              ))}
            </ol>
            <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer">
              <input type="checkbox" className="mt-1" checked={approved} onChange={(e) => setApproved(e.target.checked)} />
              <span className="text-sm">I've checked every page. Please print my book exactly as shown.</span>
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              {onEditPages && <Button variant="outline" className="flex-1" onClick={onEditPages}>Edit a page first</Button>}
              <Button className="flex-1" disabled={!approved} onClick={() => setStep(1)}>Looks good, continue</Button>
            </div>
          </div>
        ) : step === 1 ? (
          <div className="space-y-4">
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium mb-1">Shipping</legend>
              {shippingMethods().map((m) => {
                const late = printArrivesAfterChristmas(m.id, now);
                return (
                  <label key={m.id} className={cn("flex items-start gap-3 rounded-lg border-2 p-3 cursor-pointer", shipping === m.id ? "border-primary bg-primary/5" : "border-border")}>
                    <input type="radio" name="shipping" className="mt-1" checked={shipping === m.id} onChange={() => setShipping(m.id)} />
                    <span className="flex-1">
                      <span className="flex justify-between font-medium"><span>{m.label}</span><span>{m.price ? `+${formatPrice(m.price)}` : "Free"}</span></span>
                      <span className="block text-sm text-muted-foreground">Estimated delivery {formatDeliveryWindow(m.id, now)}</span>
                      {late && (
                        <span className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-700">
                          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />May not arrive by December 25
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </fieldset>

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

            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ship-name">Full name</Label>
                <Input id="ship-name" autoComplete="shipping name" value={address.name} onChange={(e) => set({ name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ship-street1">Street address</Label>
                <Input id="ship-street1" autoComplete="shipping address-line1" value={address.street1} onChange={(e) => set({ street1: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ship-street2">Apartment, suite, etc. <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input id="ship-street2" autoComplete="shipping address-line2" value={address.street2} onChange={(e) => set({ street2: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ship-city">City</Label>
                  <Input id="ship-city" autoComplete="shipping address-level2" value={address.city} onChange={(e) => set({ city: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ship-state">State</Label>
                  <Select value={address.state_code || undefined} onValueChange={(v) => set({ state_code: v })}>
                    <SelectTrigger id="ship-state"><SelectValue placeholder="State" /></SelectTrigger>
                    <SelectContent>
                      {US_STATES.map((s) => <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ship-zip">ZIP code</Label>
                  <Input id="ship-zip" inputMode="numeric" autoComplete="shipping postal-code" value={address.postcode} onChange={(e) => set({ postcode: e.target.value.replace(/\D/g, "").slice(0, 5) })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ship-phone">Phone</Label>
                  <Input id="ship-phone" inputMode="tel" autoComplete="shipping tel-national" value={formatPhone(address.phone_number)} onChange={(e) => set({ phone_number: e.target.value.replace(/\D/g, "").slice(0, 10) })} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Printed books currently ship to US addresses only.</p>
            </div>

            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" onClick={validate} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}Continue
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <dl className="text-sm space-y-2">
              <div className="flex justify-between"><dt>Printed book</dt><dd>{formatPrice(bookPrice)}</dd></div>
              {copies > 1 && (
                <div className="flex justify-between"><dt>{copies - 1} extra {copies === 2 ? "copy" : "copies"}</dt><dd>{formatPrice(extraCopies)}</dd></div>
              )}
              {credit > 0 && (
                <div className="flex justify-between text-primary"><dt>Credit for the PDF you already bought</dt><dd>−{formatPrice(credit)}</dd></div>
              )}
              <div className="flex justify-between"><dt>{method.label} shipping</dt><dd>{shippingPrice ? formatPrice(shippingPrice) : "Free"}</dd></div>
              <div className="flex justify-between border-t pt-2 font-semibold text-base"><dt>Total</dt><dd>{formatPrice(total)}</dd></div>
            </dl>
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <p className="font-medium">Ships to</p>
              <p>{address.name}</p>
              <p>{address.street1}{address.street2 ? `, ${address.street2}` : ""}</p>
              <p>{address.city}, {address.state_code} {address.postcode}</p>
              <p className="mt-2 text-muted-foreground">Estimated delivery {formatDeliveryWindow(shipping, now)}</p>
              {printArrivesAfterChristmas(shipping, now) && (
                <p className="mt-1 flex items-center gap-1 text-amber-700 font-medium"><AlertTriangle className="h-3.5 w-3.5" aria-hidden />May not arrive by December 25</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Your book is printed from the story as it is now, so please check every page first. Includes the digital PDF.</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)} disabled={busy}>Back</Button>
              <Button className="flex-1" onClick={checkout} disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}Pay {formatPrice(total)}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
