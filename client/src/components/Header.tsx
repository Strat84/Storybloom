import { Button } from "@/components/ui/button";
import { BookOpenIcon, SparklesIcon } from "lucide-react";

export default function Header() {

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-gradient-to-br from-primary to-chart-2 rounded-lg flex items-center justify-center">
              <BookOpenIcon className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-display font-bold bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
              StoryMagic
            </h1>
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            <Button 
              data-testid="button-create-story" 
              variant="ghost" 
              className="gap-2"
              onClick={() => {
                const section = document.getElementById('cartoon-style-section');
                if (section) {
                  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
            >
              <SparklesIcon className="h-4 w-4" />
              Create Story
            </Button>
            <Button data-testid="button-examples" variant="ghost">
              Examples
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
}