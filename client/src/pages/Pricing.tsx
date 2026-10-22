import { Gift, Heart, Shield, Truck } from "lucide-react";
import { CreateButton, FaqSection, PricingCards, Section, SectionHeading } from "@/components/marketing";
import VerifiedReviews from "@/components/VerifiedReviews";
import { generalFaqs } from "@/content/faq";
import { activeCutoff, formatCutoff, holidayPhase } from "@/lib/holiday";
import { formatDeliveryWindow, formatPrice, shippingMethods } from "@/lib/pricing";
import { useNow } from "@/lib/useNow";

export default function Pricing() {
  const now = useNow();
  const phase = holidayPhase(now);
  const cutoff = activeCutoff(phase);
  const faqs = generalFaqs().filter((f) => /cost|arrive|problem|change/i.test(f.question));

  return (
    <>
      <Section className="pb-6">
        <SectionHeading
          as="h1"
          title="Pricing and shipping"
          subtitle="Creating and previewing your story is free. Pay only when you want to download or print it."
        />
        <PricingCards />
      </Section>

      <Section className="py-6">
        <div className="max-w-3xl mx-auto rounded-2xl border bg-card p-6">
          <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2"><Truck className="h-6 w-6 text-primary" aria-hidden />Shipping</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-2 font-medium">Method</th>
                <th className="py-2 font-medium">Price</th>
                <th className="py-2 font-medium">Delivery time</th>
                <th className="py-2 font-medium">If you order today</th>
              </tr>
            </thead>
            <tbody>
              {shippingMethods().map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="py-2 font-medium">{m.label}</td>
                  <td className="py-2">{m.price ? `+${formatPrice(m.price)}` : "Free"}</td>
                  <td className="py-2">{m.minDays}–{m.maxDays} business days</td>
                  <td className="py-2">{formatDeliveryWindow(m.id, now)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-sm text-muted-foreground mt-4">
            Every book is printed to order. Printed books currently ship to US addresses only.
            {phase !== "off" && cutoff && ` For Christmas delivery, order by ${formatCutoff(cutoff)}${phase === "expressOnly" ? " with expedited shipping" : ""}.`}
          </p>
        </div>
      </Section>

      <Section className="py-6">
        <ul className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto text-center">
          <li className="space-y-2">
            <Shield className="h-8 w-8 text-primary mx-auto" aria-hidden />
            <h3 className="font-semibold">Secure checkout</h3>
            <p className="text-sm text-muted-foreground">Payments are processed securely by Stripe.</p>
          </li>
          <li className="space-y-2">
            <Heart className="h-8 w-8 text-primary mx-auto" aria-hidden />
            <h3 className="font-semibold">Preview first</h3>
            <p className="text-sm text-muted-foreground">See every page before you buy.</p>
          </li>
          <li className="space-y-2">
            <Gift className="h-8 w-8 text-primary mx-auto" aria-hidden />
            <h3 className="font-semibold">Instant digital gift</h3>
            <p className="text-sm text-muted-foreground">The PDF is ready the moment you buy.</p>
          </li>
        </ul>
      </Section>

      <div className="container mx-auto px-4 sm:px-6">
        <VerifiedReviews />
      </div>

      <FaqSection faqs={faqs} title="Pricing questions" />

      <Section className="text-center">
        <CreateButton label="Start your book free" />
      </Section>
    </>
  );
}
