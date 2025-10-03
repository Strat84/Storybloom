export interface UploadStoryImageInput {
  storyId: string;
  pageNumber: number;
  buffer: Buffer;
  contentType: string;
  fileName: string;
}