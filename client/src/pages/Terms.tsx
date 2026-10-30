import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useEffect } from "react";

export default function Terms() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-primary/5">
      <div className="container mx-auto px-6 py-16 max-w-4xl">
        <Card>
          <CardHeader>
            <h1 data-testid="heading-terms" className="text-3xl font-display font-semibold">Terms of Service</h1>
            <p data-testid="text-last-updated" className="text-sm text-muted-foreground">
              Last Updated: November 5, 2025
            </p>
          </CardHeader>
          <CardContent className="space-y-6 font-story">
            <div className="text-muted-foreground space-y-4">
              <p data-testid="text-welcome">
                Welcome to StoryBloom.ai ("StoryBloom," "we," "us," or "our").
                These Terms of Service ("Terms") govern your access to and use of our website, mobile applications, 
                and related products and services (collectively, the "Services").
              </p>
              <p data-testid="text-agreement">
                By accessing or using StoryBloom.ai, you agree to these Terms. If you do not agree, please do not use our Services.
              </p>
            </div>

            <section>
              <h2 data-testid="heading-overview" className="text-xl font-semibold mb-3">1. Overview of Our Services</h2>
              <p data-testid="text-overview" className="text-muted-foreground">
                StoryBloom.ai is an AI-powered creative platform that allows users to generate personalized stories, 
                illustrations, and printed storybooks using artificial intelligence. The Services may include interactive 
                story creation, AI-generated imagery, downloadable digital content, and made-to-order printed books.
              </p>
            </section>

            <section>
              <h2 data-testid="heading-eligibility" className="text-xl font-semibold mb-3">2. Eligibility</h2>
              <div className="text-muted-foreground space-y-2">
                <p data-testid="text-eligibility-age">
                  You must be at least 13 years old (or the minimum age of digital consent in your jurisdiction) to use our Services.
                </p>
                <p data-testid="text-eligibility-minor">
                  If you are under 18, you may only use StoryBloom.ai under the supervision of a parent or guardian who agrees to these Terms.
                </p>
              </div>
            </section>

            <section>
              <h2 data-testid="heading-accounts" className="text-xl font-semibold mb-3">3. Accounts and Security</h2>
              <p className="text-muted-foreground mb-2">You may need to create an account to access certain features. You agree to:</p>
              <ul data-testid="list-account-requirements" className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>Provide accurate and complete information.</li>
                <li>Keep your login credentials secure.</li>
                <li>Notify us immediately if you suspect unauthorized access to your account.</li>
              </ul>
              <p data-testid="text-account-responsibility" className="text-muted-foreground mt-2">
                You are responsible for all activity that occurs under your account.
              </p>
            </section>

            <section>
              <h2 data-testid="heading-user-content" className="text-xl font-semibold mb-3">4. User Content & AI-Generated Content</h2>
              
              <h3 className="text-lg font-semibold mb-2 mt-4">(a) Your Input</h3>
              <div className="text-muted-foreground space-y-2">
                <p data-testid="text-user-input">
                  You may submit text, prompts, images, or other materials ("User Input") to generate stories or illustrations.
                  You retain ownership of your User Input.
                </p>
              </div>

              <h3 className="text-lg font-semibold mb-2 mt-4">(b) AI-Generated Output</h3>
              <div className="text-muted-foreground space-y-2">
                <p data-testid="text-ai-output">
                  Our AI models use your input to generate creative works ("Output"). StoryBloom.ai does not claim ownership 
                  of your Output. However, by using our Services, you grant us a non-exclusive, worldwide, royalty-free license to:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Display, host, and reproduce your Output as needed to operate the Services.</li>
                  <li>Use anonymized examples of generated content for product improvement, marketing, and training purposes 
                    (unless you opt out by emailing support@storybloom.ai).</li>
                </ul>
                <p data-testid="text-content-responsibility">
                  You are responsible for reviewing and approving all generated content prior to sharing, publishing, or purchasing.
                </p>
                <p data-testid="text-preview-acknowledgment">
                  StoryBloom.ai provides previews of stories and images before checkout. By completing a purchase (digital or printed), 
                  you acknowledge that you have reviewed the story, text, and images and that they meet your satisfaction and quality standards.
                  If you are not satisfied with the preview, it is your responsibility to make edits or choose not to proceed with the purchase.
                </p>
                <p data-testid="text-final-sales">
                  Because AI-generated content is user-directed and variable, all sales are final once a digital download or print order is placed.
                </p>
                <p>
                  You are also responsible for reviewing all generated content for accuracy, appropriateness, and suitability before 
                  distributing or sharing it publicly.
                </p>
              </div>
            </section>

            <section>
              <h2 data-testid="heading-ip-rights" className="text-xl font-semibold mb-3">5. Intellectual Property Rights</h2>
              <div className="text-muted-foreground space-y-2">
                <p data-testid="text-ip-ownership">
                  All trademarks, logos, software, code, and content not created by users or AI generation are the property 
                  of StoryBloom.ai or its licensors.
                </p>
                <p data-testid="text-ip-restrictions">
                  You may not reproduce, distribute, modify, or create derivative works from any part of our Services except 
                  as expressly permitted in these Terms.
                </p>
              </div>
            </section>

            <section>
              <h2 data-testid="heading-restrictions" className="text-xl font-semibold mb-3">6. Use Restrictions</h2>
              <p className="text-muted-foreground mb-2">You agree not to:</p>
              <ul data-testid="list-restrictions" className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>Use the Services to generate or share unlawful, harmful, defamatory, or obscene content.</li>
                <li>Attempt to extract, reverse-engineer, or interfere with the underlying AI models.</li>
                <li>Present AI-generated content as human-authored without clear disclosure.</li>
                <li>Misuse the Services to infringe upon the rights of others.</li>
              </ul>
              <p data-testid="text-enforcement" className="text-muted-foreground mt-2">
                StoryBloom.ai reserves the right to suspend or terminate accounts that violate these rules.
              </p>
            </section>

            <section>
              <h2 data-testid="heading-ai-limitations" className="text-xl font-semibold mb-3">7. AI Limitations and Disclaimers</h2>
              <p className="text-muted-foreground mb-2">
                StoryBloom.ai uses artificial intelligence to generate creative works. You understand and agree that:
              </p>
              <ul data-testid="list-ai-limitations" className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>AI outputs may include errors, inaccuracies, or unintended content.</li>
                <li>Generated content is not guaranteed to be unique or free from similarity to existing works.</li>
                <li>You are solely responsible for reviewing all story and image previews prior to purchasing, sharing, or publishing.</li>
                <li>StoryBloom.ai disclaims all liability for dissatisfaction with AI-generated stories, text, or imagery after purchase.</li>
                <li>You are responsible for ensuring any content you publish or share complies with applicable laws and community standards.</li>
              </ul>
            </section>

            <section>
              <h2 data-testid="heading-printed-books" className="text-xl font-semibold mb-3">8. Printed Books and Orders</h2>
              <p className="text-muted-foreground mb-2">If you order a physical book:</p>
              <ul data-testid="list-printed-books" className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>Prices, taxes, and shipping fees are displayed at checkout.</li>
                <li>Delivery times are estimates and may vary.</li>
                <li>Because each book is made-to-order based on AI-generated content, no refunds or reprints will be issued for 
                  dissatisfaction related to story content, image quality, or style.</li>
                <li>You are responsible for verifying that the digital preview meets your expectations before placing an order.</li>
                <li>If your printed book arrives damaged or misprinted (e.g., damaged or missing pages), tell us within 30 days of delivery and we will send a free reprint or give you a refund. See <a className="underline" href="/shipping-returns">Shipping and returns</a>.</li>
                <li>In test or beta periods, you may be asked to use temporary payment methods or test credit cards.</li>
              </ul>
            </section>

            <section>
              <h2 data-testid="heading-privacy" className="text-xl font-semibold mb-3">9. Privacy</h2>
              <div className="text-muted-foreground space-y-2">
                <p data-testid="text-privacy-policy">
                  Your privacy is important to us. Please review our Privacy Policy to understand how we collect, use, and safeguard information.
                </p>
                <p data-testid="text-children-privacy">
                  StoryBloom.ai does not knowingly collect personal data from children under 13. If we learn that we have inadvertently 
                  collected such data, we will promptly delete it.
                </p>
              </div>
            </section>

            <section>
              <h2 data-testid="heading-payment" className="text-xl font-semibold mb-3">10. Payment Terms</h2>
              <div className="text-muted-foreground space-y-2">
                <p data-testid="text-payment-processor">
                  Payments are processed through secure third-party providers (e.g., Stripe).
                  By submitting payment information, you authorize StoryBloom.ai and its payment processor to charge your account 
                  for purchases made through the platform.
                </p>
                <p data-testid="text-payment-final">
                  All payments are final unless otherwise stated in these Terms.
                </p>
              </div>
            </section>

            <section>
              <h2 data-testid="heading-termination" className="text-xl font-semibold mb-3">11. Termination</h2>
              <div className="text-muted-foreground space-y-2">
                <p data-testid="text-termination-by-us">
                  We may suspend or terminate access to our Services at any time, with or without notice, for violation of these 
                  Terms or to protect our systems and users.
                </p>
                <p data-testid="text-termination-by-user">
                  You may also terminate your account at any time by contacting support@storybloom.ai.
                </p>
              </div>
            </section>

            <section>
              <h2 data-testid="heading-indemnification" className="text-xl font-semibold mb-3">12. Indemnification</h2>
              <p data-testid="text-indemnification" className="text-muted-foreground">
                You agree to indemnify and hold harmless StoryBloom.ai, its affiliates, officers, and employees from any claims, 
                liabilities, or damages arising from your use of the Services, your generated content, or any violation of these Terms.
              </p>
            </section>

            <section>
              <h2 data-testid="heading-warranties" className="text-xl font-semibold mb-3">13. Disclaimer of Warranties</h2>
              <div className="text-muted-foreground space-y-2">
                <p data-testid="text-as-is">
                  Our Services are provided "as is" and "as available."
                </p>
                <p data-testid="text-no-warranties">
                  We make no warranties, express or implied, regarding the accuracy, quality, or reliability of any AI-generated 
                  content or the operation of our Services.
                </p>
              </div>
            </section>

            <section>
              <h2 data-testid="heading-liability" className="text-xl font-semibold mb-3">14. Limitation of Liability</h2>
              <p data-testid="text-liability" className="text-muted-foreground">
                To the fullest extent permitted by law, StoryBloom.ai and its affiliates are not liable for any indirect, incidental, 
                special, consequential, or punitive damages arising from your use of the Services or any AI-generated content, even 
                if we have been advised of the possibility of such damages.
              </p>
            </section>

            <section>
              <h2 data-testid="heading-modifications" className="text-xl font-semibold mb-3">15. Modifications to the Service</h2>
              <div className="text-muted-foreground space-y-2">
                <p data-testid="text-service-modifications">
                  We may modify, update, or discontinue any aspect of the Services at any time without notice.
                </p>
                <p data-testid="text-terms-modifications">
                  We may also update these Terms periodically. The updated version will take effect upon posting, and your continued 
                  use of the Services constitutes acceptance of the new Terms.
                </p>
              </div>
            </section>

            <section>
              <h2 data-testid="heading-governing-law" className="text-xl font-semibold mb-3">16. Governing Law</h2>
              <div className="text-muted-foreground space-y-2">
                <p data-testid="text-governing-law">
                  These Terms are governed by the laws of the State of California, without regard to its conflict-of-law principles.
                </p>
                <p data-testid="text-dispute-resolution">
                  Any disputes shall be resolved exclusively in the courts located in Los Angeles, California.
                </p>
              </div>
            </section>

            <section>
              <h2 data-testid="heading-contact" className="text-xl font-semibold mb-3">17. Contact Us</h2>
              <div className="text-muted-foreground space-y-2">
                <p data-testid="text-contact-intro">
                  If you have questions about these Terms, please contact us at:
                </p>
                <p data-testid="text-contact-email" className="font-semibold">
                  Email: support@storybloom.ai
                </p>
                <p data-testid="text-contact-website" className="font-semibold">
                  Website: www.storybloom.ai
                </p>
              </div>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
