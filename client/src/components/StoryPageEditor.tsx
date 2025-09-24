import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EditIcon, ImageIcon, RefreshCwIcon } from "lucide-react";
import { useState } from "react";

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

interface StoryPageEditorProps {
  page: StoryPage;
  onPageUpdate?: (page: StoryPage) => void;
  onRegenerateImage?: (pageId: string) => void;
}

export default function StoryPageEditor({ 
  page, 
  onPageUpdate, 
  onRegenerateImage 
}: StoryPageEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPage, setEditedPage] = useState(page);

  const handleSave = () => {
    console.log('Saving page:', editedPage);
    onPageUpdate?.(editedPage);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedPage(page);
    setIsEditing(false);
  };

  const handleRegenerateImage = () => {
    console.log('Regenerating image for page:', page.id);
    onRegenerateImage?.(page.id);
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-bold text-lg">
          Page {page.pageNumber}
        </h3>
        <div className="flex gap-2">
          {!isEditing ? (
            <Button
              data-testid={`button-edit-page-${page.id}`}
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="gap-1"
            >
              <EditIcon className="h-3 w-3" />
              Edit
            </Button>
          ) : (
            <>
              <Button
                data-testid={`button-cancel-edit-${page.id}`}
                variant="outline"
                size="sm"
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button
                data-testid={`button-save-page-${page.id}`}
                size="sm"
                onClick={handleSave}
              >
                Save
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Text Content */}
        <div className="space-y-4">
          <div>
            <Label htmlFor={`story-text-${page.id}`} className="text-sm font-semibold mb-2 block">
              Story Text
            </Label>
            {isEditing ? (
              <Textarea
                id={`story-text-${page.id}`}
                data-testid={`textarea-story-text-${page.id}`}
                value={editedPage.text}
                onChange={(e) => setEditedPage({ ...editedPage, text: e.target.value })}
                className="min-h-[120px] font-story text-base resize-none"
                placeholder="Write the story text for this page..."
              />
            ) : (
              <div 
                data-testid={`text-story-content-${page.id}`}
                className="p-3 bg-muted/30 rounded-md min-h-[120px] font-story text-base"
              >
                {page.text || <span className="text-muted-foreground italic">No text yet...</span>}
              </div>
            )}
          </div>

          {/* Image Prompt */}
          <div>
            <Label htmlFor={`image-prompt-${page.id}`} className="text-sm font-semibold mb-2 block">
              Image Description
            </Label>
            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  id={`image-prompt-${page.id}`}
                  data-testid={`textarea-image-prompt-${page.id}`}
                  value={editedPage.imagePrompt}
                  onChange={(e) => setEditedPage({ ...editedPage, imagePrompt: e.target.value })}
                  className="min-h-[80px] resize-none"
                  placeholder="Describe the illustration for this page..."
                />
                <p className="text-xs text-muted-foreground">
                  Be specific about characters, setting, mood, and style for best results
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div 
                  data-testid={`text-image-prompt-${page.id}`}
                  className="p-3 bg-muted/30 rounded-md min-h-[80px]"
                >
                  {page.imagePrompt || <span className="text-muted-foreground italic">No image description yet...</span>}
                </div>
                {!isEditing && page.imagePrompt && (
                  <Button
                    data-testid={`button-${page.imageUrl ? 'regenerate' : 'generate'}-image-${page.id}`}
                    variant="outline"
                    size="sm"
                    onClick={handleRegenerateImage}
                    className="gap-1"
                  >
                    <RefreshCwIcon className="h-3 w-3" />
                    {page.imageUrl ? 'Regenerate Image' : 'Generate Image'}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Image Preview */}
        <div className="space-y-4">
          <Label className="text-sm font-semibold">Image Preview</Label>
          <div className="aspect-[4/3] bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/20 flex items-center justify-center">
            {page.imageUrl ? (
              <img
                src={page.imageUrl}
                alt={`Illustration for page ${page.pageNumber}`}
                className="w-full h-full object-cover rounded-lg"
                data-testid={`img-page-preview-${page.id}`}
              />
            ) : (
              <div className="text-center text-muted-foreground">
                <ImageIcon className="h-12 w-12 mx-auto mb-2" />
                <p className="text-sm">Image will appear here</p>
                <p className="text-xs">after generation</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}