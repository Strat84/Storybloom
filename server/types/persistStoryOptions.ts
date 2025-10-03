export interface PersistStoryOptions {
  userId?: string;
  storyId?: string;
  authorizationHeader?: string;
  pageIdsMapping?: Array<{
    pageNumber: number;
    pageId: string;
  }>;
}