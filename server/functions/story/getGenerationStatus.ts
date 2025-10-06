
import { APIGatewayProxyHandler } from 'aws-lambda';
import { getStoryStatus } from '../../services/dynamodb/story';
import { buildResponse } from '../../utils/buildResponse';
import { extractUserIdFromToken } from '../../utils/extractUserIdFromToken';

// This function is polled by the client to check the status of a story generation.
export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        const userId = extractUserIdFromToken(event);
        if (!userId) {
            return buildResponse(401, { error: 'Unauthorized' });
        }

        const storyId = event.pathParameters?.storyId;
        if (!storyId) {
            return buildResponse(400, { error: 'Missing storyId path parameter' });
        }

        console.log(`Checking status for storyId: ${storyId}, userId: ${userId}`);

        const story = await getStoryStatus(userId, storyId);

        if (!story) {
            return buildResponse(404, { error: 'Story not found or access denied' });
        }

        return buildResponse(200, {
            storyId: story.storyId,
            status: story.generationStatus,
            title: story.title, // Also return title if available
        });

    } catch (error) {
        console.error('Error getting story status:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return buildResponse(500, { error: `Failed to get story status: ${errorMessage}` });
    }
};
