import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useEffect } from "react";

export default function Privacy() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-primary/5">
      <div className="container mx-auto px-6 py-16 max-w-4xl">
        <Card>
          <CardHeader>
            <h1 data-testid="heading-privacy" className="text-3xl font-display font-semibold">Privacy Policy</h1>
          </CardHeader>
          <CardContent className="space-y-6 font-story">
            <section>
              <h2 data-testid="heading-info-collect" className="text-xl font-semibold mb-3">1. Information We Collect</h2>
              <p data-testid="text-info-collect" className="text-muted-foreground">
                We collect information you provide when creating stories, including story prompts,
                character details, and preferences. We also collect usage data to improve our service.
              </p>
            </section>

            <section>
              <h2 data-testid="heading-info-use" className="text-xl font-semibold mb-3">2. How We Use Your Information</h2>
              <p data-testid="text-info-use" className="text-muted-foreground">
                Your information is used to generate personalized storybooks, process payments, and
                improve our AI-powered content generation. We do not sell your personal information to
                third parties.
              </p>
            </section>

            <section>
              <h2 data-testid="heading-security" className="text-xl font-semibold mb-3">3. Data Storage and Security</h2>
              <p data-testid="text-security" className="text-muted-foreground">
                We implement industry-standard security measures to protect your data. Your stories and
                personal information are stored securely and encrypted.
              </p>
            </section>

            <section>
              <h2 data-testid="heading-children" className="text-xl font-semibold mb-3">4. Children's Privacy</h2>
              <p data-testid="text-children" className="text-muted-foreground">
                StoryBloom is designed for use by parents and guardians to create content for children.
                We do not knowingly collect personal information directly from children under 13.
              </p>
            </section>

            <section>
              <h2 data-testid="heading-third-party" className="text-xl font-semibold mb-3">5. Third-Party Services</h2>
              <p data-testid="text-third-party" className="text-muted-foreground">
                We use third-party AI services (OpenAI and Google Gemini) to generate story content and
                illustrations. These services process your story prompts according to their own privacy
                policies.
              </p>
            </section>

            <section>
              <h2 data-testid="heading-rights" className="text-xl font-semibold mb-3">6. Your Rights</h2>
              <p data-testid="text-rights" className="text-muted-foreground">
                You have the right to access, modify, or delete your personal information at any time.
                Contact us to exercise these rights.
              </p>
            </section>

            <section>
              <h2 data-testid="heading-cookies" className="text-xl font-semibold mb-3">7. Cookies</h2>
              <p data-testid="text-cookies" className="text-muted-foreground">
                We use cookies to maintain your session and improve user experience. You can disable
                cookies in your browser settings, though some features may not function properly.
              </p>
            </section>

            <section>
              <h2 data-testid="heading-policy-changes" className="text-xl font-semibold mb-3">8. Changes to Privacy Policy</h2>
              <p data-testid="text-policy-changes" className="text-muted-foreground">
                We may update this privacy policy from time to time. We will notify users of any
                significant changes.
              </p>
            </section>

            <div className="pt-6 text-sm text-muted-foreground">
              <p data-testid="text-privacy-last-updated">Last updated: November 7, 2025</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
