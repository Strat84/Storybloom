import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Import components
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import ChatInterface from "@/components/ChatInterface";
import StoryPageEditor from "@/components/StoryPageEditor";
import StoryPreview from "@/components/StoryPreview";
import { CartoonStyleSelector, type CartoonStyle } from "@/components/CartoonStyleSelector";

// Import sample image
import sampleImage from "@assets/generated_images/Sample_storybook_page_illustration_9b27cb31.png";

interface StoryPage {
  id: string;
  storyId: string;
  pageNumber: number;
  text: string;
  imagePrompt: string;
  imageUrl?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface Story {
  id: string;
  title: string;
  author: string;
  status: string;
  totalPages: number;
  description?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface StoryWithPages {
  story: Story;
  pages: StoryPage[];
}

function StoryCreator() {
  const [currentStep, setCurrentStep] = useState<'idea' | 'edit' | 'preview'>('idea');
  const [currentStory, setCurrentStory] = useState<Story | null>(null);
  const [currentPages, setCurrentPages] = useState<StoryPage[]>([]);
  const [characterDescription, setCharacterDescription] = useState<string>('');
  const [selectedCartoonStyle, setSelectedCartoonStyle] = useState<CartoonStyle>('traditional');
  const { toast } = useToast();


  const handleStoryGenerated = (storyData: StoryWithPages) => {
    console.log('Story generated from chat:', storyData);
    setCurrentStory(storyData.story);
    setCurrentPages(storyData.pages);
    setCurrentStep('edit');
  };

  const handleCartoonStyleChange = (style: CartoonStyle) => {
    setSelectedCartoonStyle(style);
    console.log('Cartoon style changed to:', style);
  };

  const updatePageMutation = useMutation({
    mutationFn: async (updatedPage: StoryPage) => {
      if (!currentStory) throw new Error('No story selected');
      
      const response = await apiRequest("PATCH", `/api/stories/${currentStory.id}/pages/${updatedPage.id}`, {
        text: updatedPage.text,
        imagePrompt: updatedPage.imagePrompt
      });
      return await response.json();
    },
    onSuccess: (updatedPageFromServer) => {
      // Update the local state with the server response
      setCurrentPages(pages => 
        pages.map(page => 
          page.id === updatedPageFromServer.id ? updatedPageFromServer : page
        )
      );
      toast({
        title: "Page Updated",
        description: "Your changes have been saved successfully!",
      });
    },
    onError: (error) => {
      console.error('Page update failed:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handlePageUpdate = (updatedPage: StoryPage) => {
    updatePageMutation.mutate(updatedPage);
  };

  const regenerateImageMutation = useMutation({
    mutationFn: async (pageId: string) => {
      if (!currentStory) throw new Error('No story selected');
      
      // The backend route uses the imagePrompt stored in the database, so no need to send it
      const response = await apiRequest("POST", `/api/stories/${currentStory.id}/pages/${pageId}/generate-image`, {});
      return await response.json();
    },
    onSuccess: (data) => {
      // Update the page with the new image URL
      setCurrentPages(pages => 
        pages.map(page => 
          page.id === data.page.id ? data.page : page
        )
      );
      toast({
        title: "Image Generated",
        description: "Your story page image has been updated successfully!",
      });
    },
    onError: (error) => {
      console.error('Image generation failed:', error);
      toast({
        title: "Image Generation Failed",
        description: "Failed to generate image. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleRegenerateImage = (pageId: string) => {
    console.log('Regenerating image for page:', pageId);
    regenerateImageMutation.mutate(pageId);
  };

  const batchGenerateImagesMutation = useMutation({
    mutationFn: async () => {
      if (!currentStory) throw new Error('No story selected');
      
      const response = await apiRequest("POST", `/api/stories/${currentStory.id}/generate-all-images`, {
        characterDescription: characterDescription.trim() || undefined
      });
      return await response.json();
    },
    onSuccess: (data) => {
      // Update all pages with the new images
      setCurrentPages(data.pages);
      toast({
        title: "All Images Generated!",
        description: `Successfully generated images for your story with consistent characters and style.`,
      });
    },
    onError: (error) => {
      console.error('Batch image generation failed:', error);
      toast({
        title: "Batch Generation Failed",
        description: "Failed to generate all images. Please try again or generate them individually.",
        variant: "destructive",
      });
    }
  });

  const handleBatchGenerateImages = () => {
    batchGenerateImagesMutation.mutate();
  };


  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'idea':
        return (
          <div className="space-y-12">
            <HeroSection />
            <div id="cartoon-style-section">
              <CartoonStyleSelector
                selectedStyle={selectedCartoonStyle}
                onStyleChange={handleCartoonStyleChange}
              />
            </div>
            <div className="container mx-auto px-6">
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-display font-bold mb-4">
                    Share Your Story Idea
                  </h2>
                  <p className="text-muted-foreground font-story text-lg">
                    Tell our AI assistant about the story you'd like to create. 
                    Be as creative and detailed as you like!
                  </p>
                </div>
                <ChatInterface onStoryGenerated={handleStoryGenerated} />
              </div>
            </div>
          </div>
        );

      case 'edit':
        return (
          <div className="container mx-auto px-6 py-8">
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="text-center">
                <h2 className="text-3xl font-display font-bold mb-4">
                  Edit Your Story
                </h2>
                <p className="text-muted-foreground font-story text-lg mb-6">
                  Refine your story text and image descriptions. Make it perfect!
                </p>
                <div className="flex justify-center gap-3 mb-6">
                  <button
                    data-testid="button-back-to-chat"
                    onClick={() => setCurrentStep('idea')}
                    className="text-muted-foreground hover:text-foreground text-sm font-medium"
                  >
                    ← Back to Chat
                  </button>
                  <button
                    data-testid="button-preview-story"
                    onClick={() => setCurrentStep('preview')}
                    className="bg-primary text-primary-foreground px-4 py-1 rounded-lg text-sm font-medium hover-elevate"
                  >
                    Preview Story →
                  </button>
                </div>
                
                {/* Character Consistency & Batch Image Generation */}
                <div className="text-center mb-6">
                  <div className="bg-card border rounded-lg p-6 max-w-3xl mx-auto">
                    <h3 className="font-semibold mb-2">Character Consistency</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Define your main character's appearance once to ensure they look the same in every illustration.
                    </p>
                    
                    <div className="mb-4">
                      <Label htmlFor="character-description" className="text-sm font-semibold mb-2 block text-left">
                        Main Character Description
                      </Label>
                      <Textarea
                        id="character-description"
                        data-testid="textarea-character-description"
                        value={characterDescription}
                        onChange={(e) => setCharacterDescription(e.target.value)}
                        className="min-h-[100px] resize-none mb-2"
                        placeholder="Describe your main character's appearance in detail... (e.g., 'A small bunny with soft white fur, big floppy ears, bright blue eyes, wearing a red scarf and tiny blue boots. Has a gentle, curious expression.')"
                      />
                      <p className="text-xs text-muted-foreground text-left">
                        Be specific about physical features, clothing, colors, and style. This description will be used for all images.
                      </p>
                    </div>
                    
                    <Button
                      data-testid="button-batch-generate-images"
                      onClick={handleBatchGenerateImages}
                      disabled={batchGenerateImagesMutation.isPending || !characterDescription.trim()}
                      className="gap-2"
                    >
                      {batchGenerateImagesMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-background border-t-transparent"></div>
                          Generating All Images...
                        </>
                      ) : (
                        <>
                          <RefreshCwIcon className="h-4 w-4" />
                          Generate All Images with Consistent Character
                        </>
                      )}
                    </Button>
                    
                    {!characterDescription.trim() && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                        Please add a character description above to ensure consistency
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              {currentPages.map((page) => (
                <StoryPageEditor
                  key={page.id}
                  page={page}
                  onPageUpdate={handlePageUpdate}
                  onRegenerateImage={handleRegenerateImage}
                />
              ))}
            </div>
          </div>
        );

      case 'preview':
        return (
          <div className="container mx-auto px-6 py-8">
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="text-center">
                <button
                  data-testid="button-back-to-edit"
                  onClick={() => setCurrentStep('edit')}
                  className="text-muted-foreground hover:text-foreground text-sm font-medium mb-4 inline-block"
                >
                  ← Back to Edit
                </button>
              </div>
              
              {currentStory && (
                <StoryPreview
                  story={{
                    ...currentStory,
                    pages: currentPages
                  }}
                  onEdit={() => setCurrentStep('edit')}
                  onDownload={(format) => console.log('Download', format)}
                  onShare={() => console.log('Share story')}
                />
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      <Header />
      <main className="pb-12">
        {renderCurrentStep()}
      </main>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={StoryCreator} />
      <Route>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Page not found</h1>
            <a href="/" className="text-primary hover:underline">
              Return home
            </a>
          </div>
        </div>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;