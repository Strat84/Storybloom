# Changelog

All notable changes to storybloom.ai. Newest first.

## Unreleased (branch `holiday-2026`)

### P0-1: Remove fake testimonials
- Removed the "Sarah M.", "Michael R." and "Emma L." testimonials from the pricing page. The business has no customers yet, so they could not be real.
- Added a `VerifiedReviews` section that renders nothing unless it is given reviews tied to a real order ID with the buyer's display consent. It shows first name and last initial only.
- Removed two other unsupported claims from the pricing page: the "Most Popular" badge and tagline (no sales yet), and "printing stories worldwide" (the print checkout only accepts US addresses).
- Still to do (needs backend + email service): the in-app review form, storage with the order ID, and the post-delivery "leave a review" email.
