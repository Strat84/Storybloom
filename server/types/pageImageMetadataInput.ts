export interface PageImageMetadataInput {
  storyId: string;
  pageNumber: number;
  imageUrl: string;
  imageKey: string;
  imageGenerationCount: number;
  imageGenerationDate: string;
  lastImageGeneratedAt: string;
}