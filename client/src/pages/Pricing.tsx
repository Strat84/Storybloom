import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Download, BookOpen, Sparkles, Package, Truck, TruckIcon, Clock, Shield, Heart, Star } from "lucide-react";
import { useState } from "react";
import confetti from "canvas-confetti";
import { useLocation } from "wouter";
import VerifiedReviews from "@/components/VerifiedReviews";

export default function Pricing() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#8B5CF6', '#EC4899', '#F59E0B'],
    });
    
    setTimeout(() => {
      setLocation('/');
      setTimeout(() => {
        const section = document.getElementById('cartoon-style-section');
        if (section) {
          section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }, 1000);
  };

  const digitalFeatures = [
    "Create your story today",
    "Download in full-color PDF",
    "Read digitally or print at home",
    "Great for bedtime & creative play",
  ];

  const printedFeatures = [
    "Premium full-color printing",
    "Professionally bound",
    "Shipped to your home",
    "Perfect as a gift or keepsake",
  ];

  const printedTiers = [
    {
      id: "softcover",
      name: "Tiny Tale",
      price: "$16.99",
      pages: "10 pages",
      tagline: "A magical keepsake",
      popular: false,
    },
    {
      id: "deluxe",
      name: "Hero's Journey",
      price: "$18.99",
      pages: "15 pages",
      tagline: "Room for a bigger adventure",
      popular: true,
    },
    {
      id: "collector",
      name: "Legendary Story",
      price: "$20.99",
      pages: "20 pages",
      tagline: "Bigger adventure, more memories",
      popular: false,
    },
  ];

  const shippingOptions = [
    {
      method: "Standard",
      price: "$6.69",
      delivery: "11-13 days",
    },
    {
      method: "Express",
      price: "$21.74",
      delivery: "6-8 days",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-primary/5">
      <div className="container mx-auto px-6 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 mb-4">
            <Sparkles className="h-6 w-6 text-primary" />
            <Badge variant="secondary" className="text-sm font-story">
              Choose Your Story Adventure
            </Badge>
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-5xl font-display font-bold mb-4 bg-gradient-to-r from-primary via-chart-2 to-primary bg-clip-text text-transparent">
            Make Your Story Real
          </h1>
          <p className="text-xl text-muted-foreground font-story max-w-2xl mx-auto">
            Every child deserves to be the hero of their story.
          </p>
          <p className="text-lg text-muted-foreground font-story mt-2">
            Digital Magic or Printed Keepsake?
          </p>
        </div>

        {/* Digital Package */}
        <div className="max-w-4xl mx-auto mb-20">
          <h2 className="text-3xl font-display font-bold text-center mb-8 flex items-center justify-center gap-2">
            <Download className="h-8 w-8 text-primary" />
            Digital Storybook
          </h2>
          <Card className={`hover-elevate transition-all duration-300 border-2 ${selectedPlan === 'digital' ? 'border-primary shadow-lg shadow-primary/20' : 'border-border'}`}>
            <CardHeader className="text-center pb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center">
                  <Download className="h-6 w-6 text-primary-foreground" />
                </div>
              </div>
              <CardTitle className="text-2xl font-display">Download Only</CardTitle>
              <CardDescription className="text-base font-story">
                Bring your story to life instantly — no printing required.
              </CardDescription>
              <div className="mt-4">
                <span className="text-5xl font-bold text-primary">$2.99</span>
              </div>
            </CardHeader>
            <CardContent className="pb-6">
              <div className="space-y-3">
                {digitalFeatures.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm font-story">{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button
                data-testid="button-select-digital"
                size="lg"
                className="gap-2 px-8"
                onClick={() => handleSelectPlan('digital')}
              >
                <Sparkles className="h-4 w-4" />
                Create My Story
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Printed Packages */}
        <div className="mb-16">
          <h2 className="text-3xl font-display font-bold text-center mb-8 flex items-center justify-center gap-2">
            <BookOpen className="h-8 w-8 text-primary" />
            Printed Storybook Packages
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {printedTiers.map((tier) => (
              <Card
                key={tier.id}
                className={`hover-elevate transition-all duration-300 border-2 relative ${
                  selectedPlan === tier.id ? 'border-primary shadow-lg shadow-primary/20' : 'border-border'
                } ${tier.popular ? 'md:scale-105' : ''}`}
              >
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-primary to-chart-2 text-primary-foreground gap-1 px-4 py-1">
                      <Star className="h-3 w-3" />
                      Recommended
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center">
                      <BookOpen className="h-6 w-6 text-primary-foreground" />
                    </div>
                  </div>
                  <div className="mb-2">
                    <Badge variant="secondary" className="text-base font-bold px-4 py-1">
                      {tier.pages}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl font-display">{tier.name}</CardTitle>
                  <CardDescription className="text-sm font-story italic">
                    {tier.tagline}
                  </CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-primary">{tier.price}</span>
                  </div>
                </CardHeader>
                <CardContent className="pb-6">
                  <div className="space-y-3">
                    {printedFeatures.map((feature, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm font-story">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-center">
                  <Button
                    data-testid={`button-select-${tier.id}`}
                    size="lg"
                    className="gap-2 px-8"
                    variant={tier.popular ? "default" : "outline"}
                    onClick={() => handleSelectPlan(tier.id)}
                  >
                    <Sparkles className="h-4 w-4" />
                    Create My Story
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* Shipping Options */}
          <div className="max-w-2xl mx-auto mt-12">
            <Card className="bg-card/50 backdrop-blur">
              <CardHeader className="text-center pb-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Truck className="h-6 w-6 text-primary" />
                  <CardTitle className="text-xl font-display">Shipping Options</CardTitle>
                </div>
                <CardDescription className="font-story italic">
                  Every book is made-to-order with care.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {shippingOptions.map((option, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 rounded-lg bg-background border hover-elevate"
                    >
                      <div className="flex items-center gap-3">
                        {option.method === "Standard" ? (
                          <TruckIcon className="h-5 w-5 text-primary" />
                        ) : (
                          <Clock className="h-5 w-5 text-primary" />
                        )}
                        <div>
                          <p className="font-semibold">{option.method}</p>
                          <p className="text-sm text-muted-foreground">{option.delivery}</p>
                        </div>
                      </div>
                      <span className="text-lg font-bold text-primary">{option.price}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Trust Elements */}
        <div className="max-w-4xl mx-auto mb-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="flex flex-col items-center gap-2">
              <Shield className="h-10 w-10 text-primary" />
              <h3 className="font-semibold">Safe & Secure</h3>
              <p className="text-sm text-muted-foreground font-story">Safe & secure checkout</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Heart className="h-10 w-10 text-primary" />
              <h3 className="font-semibold">Kid-Friendly</h3>
              <p className="text-sm text-muted-foreground font-story">Kid-friendly platform</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <BookOpen className="h-10 w-10 text-primary" />
              <h3 className="font-semibold">US Shipping</h3>
              <p className="text-sm text-muted-foreground font-story">Made to order and shipped to US addresses</p>
            </div>
          </div>
        </div>

        {/* Verified buyer reviews only. Hidden until a real review exists. */}
        <VerifiedReviews />

        {/* Final CTA */}
        <div className="max-w-4xl mx-auto">
          <Card className="bg-gradient-to-r from-primary/10 via-chart-2/10 to-primary/10 border-2 border-primary/20">
            <CardContent className="text-center py-12">
              <div className="flex justify-center gap-2 mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
                <BookOpen className="h-8 w-8 text-primary" />
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-4xl font-display font-bold mb-4">
                Ready to bring your imagination to life?
              </h2>
              <p className="text-lg text-muted-foreground font-story mb-6">
                Start creating magical stories that your children will treasure forever.
              </p>
              <Button
                data-testid="button-start-creating"
                size="lg"
                className="gap-2 px-8"
                onClick={() => handleSelectPlan('cta')}
              >
                <Sparkles className="h-4 w-4" />
                Create My Story
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}