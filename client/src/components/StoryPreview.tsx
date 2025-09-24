import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DownloadIcon, PrinterIcon, ShareIcon, EditIcon, BookIcon } from "lucide-react";
import { useState } from "react";
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
  pages: StoryPage[];
  coverImage?: string;
}

interface StoryPreviewProps {
  story: Story;
  onEdit?: () => void;
  onDownload?: (format: 'pdf' | 'epub') => void;
  onShare?: () => void;
}

export default function StoryPreview({ 
  story, 
  onEdit, 
  onDownload, 
  onShare 
}: StoryPreviewProps) {
  const [selectedPage, setSelectedPage] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  const handleDownload = async (format: 'pdf' | 'epub') => {
    setIsExporting(true);
    console.log(`Downloading ${format.toUpperCase()}:`, story.title);
    
    try {
      if (format === 'pdf') {
        // Real PDF export
        const response = await fetch(`/api/stories/${story.id}/export/pdf`);
        
        if (!response.ok) {
          throw new Error('Failed to export PDF');
        }
        
        // Get the PDF blob
        const blob = await response.blob();
        
        // Create a download link and trigger download
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${story.title.replace(/[^a-zA-Z0-9]/g, '_')}_storybook.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        console.log('PDF exported successfully!');
        onDownload?.(format);
      } else {
        // ePub format not implemented yet
        alert('ePub export is coming soon!');
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <BookIcon className="h-5 w-5 text-primary" />
              <Badge variant="secondary">Ready to Export</Badge>
            </div>
            <h1 className="text-2xl font-display font-bold mb-2" data-testid="text-story-title">
              {story.title}
            </h1>
            <p className="text-muted-foreground font-story">
              by {story.author} • {story.pages.length} pages
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              data-testid="button-edit-story"
              variant="outline"
              onClick={onEdit}
              className="gap-1"
            >
              <EditIcon className="h-4 w-4" />
              Edit
            </Button>
            <Button
              data-testid="button-share-story"
              variant="outline"
              onClick={() => {
                console.log('Share story clicked');
                onShare?.();
              }}
              className="gap-1"
            >
              <ShareIcon className="h-4 w-4" />
              Share
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Page Navigation */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Pages</h3>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {story.pages.map((page, index) => (
                <button
                  key={page.id}
                  data-testid={`button-page-${index + 1}`}
                  onClick={() => setSelectedPage(index)}
                  className={`w-full text-left p-3 rounded-lg transition-colors hover-elevate ${
                    selectedPage === index
                      ? 'bg-primary/10 border border-primary/20'
                      : 'bg-muted/30 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-9 bg-muted rounded border flex-shrink-0 overflow-hidden">
                      {page.imageUrl ? (
                        <img 
                          src={page.imageUrl} 
                          alt={`Page ${page.pageNumber} thumbnail`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-muted-foreground/10 to-muted-foreground/5"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">Page {page.pageNumber}</p>
                      <p className="text-xs text-muted-foreground truncate font-story">
                        {page.text.substring(0, 40)}...
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </Card>

        {/* Page Preview */}
        <Card className="lg:col-span-2 p-6">
          {story.pages[selectedPage] && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-lg">
                  Page {story.pages[selectedPage].pageNumber}
                </h3>
                <div className="flex gap-1">
                  <Button
                    data-testid="button-prev-page"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedPage(Math.max(0, selectedPage - 1))}
                    disabled={selectedPage === 0}
                  >
                    ← Prev
                  </Button>
                  <Button
                    data-testid="button-next-page"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedPage(Math.min(story.pages.length - 1, selectedPage + 1))}
                    disabled={selectedPage === story.pages.length - 1}
                  >
                    Next →
                  </Button>
                </div>
              </div>

              {/* Page Content */}
              <div className="space-y-4">
                {/* Image */}
                <div className="aspect-[4/3] bg-muted/30 rounded-lg overflow-hidden">
                  {story.pages[selectedPage].imageUrl ? (
                    <img
                      src={story.pages[selectedPage].imageUrl}
                      alt={`Page ${story.pages[selectedPage].pageNumber} illustration`}
                      className="w-full h-full object-cover"
                      data-testid={`img-page-${selectedPage + 1}`}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <BookIcon className="h-12 w-12 mx-auto mb-2" />
                        <p>Image generating...</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Text */}
                <div className="bg-muted/20 rounded-lg p-4">
                  <p 
                    className="font-story text-base leading-relaxed"
                    data-testid={`text-page-content-${selectedPage + 1}`}
                  >
                    {story.pages[selectedPage].text}
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Export Actions */}
      <Card className="p-6">
        <div className="text-center space-y-4">
          <h3 className="font-display font-bold text-lg">Ready to Share Your Story?</h3>
          <p className="text-muted-foreground font-story">
            Download your finished storybook or order a printed copy
          </p>
          
          <div className="flex justify-center gap-3">
            <Button
              data-testid="button-download-pdf"
              onClick={() => handleDownload('pdf')}
              disabled={isExporting}
              className="gap-2"
            >
              <DownloadIcon className="h-4 w-4" />
              {isExporting ? 'Generating...' : 'Download PDF'}
            </Button>
            
            <Button
              data-testid="button-download-epub"
              variant="outline"
              onClick={() => handleDownload('epub')}
              disabled={isExporting}
              className="gap-2"
            >
              <DownloadIcon className="h-4 w-4" />
              Download ePub
            </Button>
            
            <Button
              data-testid="button-order-print"
              variant="outline"
              onClick={() => console.log('Order print version')}
              className="gap-2"
            >
              <PrinterIcon className="h-4 w-4" />
              Order Print
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}