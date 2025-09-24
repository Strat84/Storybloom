import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SparklesIcon, BookOpenIcon, PaletteIcon, DownloadIcon } from "lucide-react";
import heroImage from "@assets/generated_images/Magical_children_reading_storybooks_f141e6f5.png";
import processIcons from "@assets/generated_images/Storybook_creation_process_icons_11678eb6.png";

export default function HeroSection() {
  const steps = [
    {
      icon: SparklesIcon,
      title: "Share Your Idea",
      description: "Tell us about the story you want to create through our chat interface"
    },
    {
      icon: BookOpenIcon,
      title: "AI Writes Pages",
      description: "Our AI generates engaging story content page by page"
    },
    {
      icon: PaletteIcon,
      title: "Create Images",
      description: "Beautiful illustrations are generated to match your story"
    },
    {
      icon: DownloadIcon,
      title: "Download Book",
      description: "Get your finished storybook as a PDF or order a printed copy"
    }
  ];

  return (
    <div className="relative">
      {/* Hero Image Background */}
      <div className="relative h-96 lg:h-[500px] overflow-hidden rounded-xl">
        <img 
          src={heroImage} 
          alt="Children creating magical storybooks"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/70 to-background/50"></div>
        
        {/* Hero Content */}
        <div className="absolute inset-0 flex items-center">
          <div className="container mx-auto px-6">
            <div className="max-w-lg">
              <h1 className="text-4xl lg:text-6xl font-display font-bold text-foreground mb-4">
                Create
                <span className="bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
                  {" "}Magical
                </span>
                <br />Storybooks
              </h1>
              <p className="text-lg text-muted-foreground mb-6 font-story">
                Bring your child's imagination to life with AI-powered storytelling and beautiful illustrations. 
                Create personalized storybooks in minutes!
              </p>
              <div className="flex gap-3">
                <Button 
                  data-testid="button-start-creating"
                  size="lg" 
                  className="gap-2 font-semibold"
                  onClick={() => console.log('Start creating clicked')}
                >
                  <SparklesIcon className="h-5 w-5" />
                  Start Creating
                </Button>
                <Button 
                  data-testid="button-see-examples"
                  variant="outline" 
                  size="lg"
                  className="backdrop-blur-sm"
                  onClick={() => console.log('See examples clicked')}
                >
                  See Examples
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Process Steps */}
      <div className="container mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-display font-bold mb-4">How It Works</h2>
          <p className="text-muted-foreground font-story">
            Creating your child's dream storybook is easy with our 4-step process
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <Card key={index} className="p-6 text-center hover-elevate">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-chart-2 rounded-xl flex items-center justify-center mx-auto mb-4">
                <step.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-sm font-bold text-primary">{index + 1}</span>
              </div>
              <h3 className="font-semibold mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground font-story">{step.description}</p>
            </Card>
          ))}
        </div>

        {/* Process Visual */}
        <div className="mt-12 text-center">
          <img 
            src={processIcons}
            alt="Storybook creation process"
            className="max-w-full h-auto mx-auto rounded-lg shadow-lg"
          />
        </div>
      </div>
    </div>
  );
}