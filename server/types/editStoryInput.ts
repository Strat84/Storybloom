export interface EditStoryInput {
  storyId: string;
  userId: string;
  title?: string;
  pages?: Array<{
    pageNumber: number;
    text?: string;
    imagePrompt?: string;
    shouldRegenerateImage?: boolean;
  }>;
}