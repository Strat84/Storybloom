import { APIGatewayProxyHandler } from 'aws-lambda';
import { buildResponse } from '../../utils/buildResponse';
import { extractUserIdFromToken } from '../../utils/extractUserIdFromToken';
import { getStoryStatus } from '../../services/dynamodb/story';

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        const userId = extractUserIdFromToken(event.headers.Authorization);
        if (!userId) {
            return buildResponse(401, { error: 'Unauthorized' });
        }

        const storyId = event.pathParameters?.storyId;
        if (!storyId) {
            return buildResponse(400, { error: 'Missing storyId' });
        }

        const story = await getStoryStatus(userId, storyId);

        if (!story) {
            return buildResponse(404, { error: 'Story not found' });
        }

        return buildResponse(200, {
            storyId: story.storyId,
            status: story.status, // PENDING, COMPLETED, FAILED
            title: story.title
        });

    } catch (error) {
        console.error('Error getting story status:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return buildResponse(500, { error: errorMessage });
    }
};