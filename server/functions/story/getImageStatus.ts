import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getStoryPageItem } from '../../services/dynamodb/story';
import { buildResponse } from '../../utils/buildResponse';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const { storyId, pageNumber } = event.pathParameters as { storyId: string; pageNumber: string };

  try {
    const pageNumberInt = parseInt(pageNumber, 10);
    const pageData = await getStoryPageItem(storyId, pageNumberInt);

    if (!pageData) {
      return buildResponse(404, { error: 'Page not found' });
    }

    return buildResponse(200, {
        status: pageData.imageGenerationStatus || 'N/A',
        jobId: pageData.imageGenerationJobId || null,
        imageUrl: pageData.imageUrl || null,
        imageGenerationCount: pageData.imageGenerationCount || 0,
        lastGeneratedAt: pageData.lastImageGeneratedAt || null,
    });
  } catch (error) {
    console.error('Get image status error:', error);
    return buildResponse(500, {
        error: error instanceof Error ? error.message : 'Failed to get image status',
    });
  }
};