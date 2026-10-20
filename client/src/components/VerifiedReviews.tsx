import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { BadgeCheck, Star } from "lucide-react";

/**
 * A review left by a real buyer, collected in the app after delivery.
 *
 * Reviews are only ever created from a real order (orderId) with the buyer's
 * consent to display. Never seed, generate, or hand-write entries here: the
 * FTC's 2024 rule on reviews and testimonials allows civil penalties per
 * fake review.
 */
export interface VerifiedReview {
  id: string;
  orderId: string;
  firstName: string;
  lastInitial: string;
  rating: number;
  text: string;
  createdAt: string;
  verifiedPurchase: boolean;
  displayConsent: boolean;
}

/** First name and last initial only, e.g. "Jordan P." */
export function reviewerDisplayName(review: Pick<VerifiedReview, "firstName" | "lastInitial">) {
  const initial = review.lastInitial.trim().charAt(0).toUpperCase();
  return initial ? `${review.firstName.trim()} ${initial}.` : review.firstName.trim();
}

export function displayableReviews(reviews: VerifiedReview[] | undefined) {
  return (reviews ?? []).filter(
    (r) => r.verifiedPurchase && r.displayConsent && r.orderId && r.text.trim(),
  );
}

interface VerifiedReviewsProps {
  reviews?: VerifiedReview[];
  heading?: string;
}

/** Renders nothing until at least one verified, consented buyer review exists. */
export default function VerifiedReviews({ reviews, heading = "What families say" }: VerifiedReviewsProps) {
  const visible = displayableReviews(reviews);
  if (visible.length === 0) return null;

  return (
    <section aria-labelledby="verified-reviews-heading" className="max-w-6xl mx-auto mb-16">
      <h2 id="verified-reviews-heading" className="text-3xl font-display font-bold text-center mb-2">
        {heading}
      </h2>
      <p className="text-center text-sm text-muted-foreground mb-10">
        Every review comes from a verified StoryBloom order.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {visible.map((review) => (
          <Card key={review.id}>
            <CardHeader>
              <div className="flex gap-1 mb-2" aria-label={`${review.rating} out of 5 stars`}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${i < review.rating ? "fill-primary text-primary" : "text-muted-foreground"}`}
                  />
                ))}
              </div>
              <CardDescription className="text-base font-story">"{review.text}"</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <p className="font-semibold text-sm">{reviewerDisplayName(review)}</p>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <BadgeCheck className="h-3.5 w-3.5 text-primary" />
                Verified buyer
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
