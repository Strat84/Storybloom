import { APIGatewayProxyHandler } from 'aws-lambda';
import { buildResponse } from '../../utils/buildResponse';
import { StoryGenerationRequest } from '../../services/openaiService';
import { extractUserIdFromToken } from '../../utils/extractUserIdFromToken';
import { createPendingStory } from '../../services/dynamodb/story';
import { v4 as uuidv4 } from 'uuid';

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        if (!event.body) {
            return buildResponse(400, { error: 'Missing request body' });
        }

        const userId = extractUserIdFromToken(event.headers.Authorization);
        if (!userId) {
            return buildResponse(401, { error: 'Unauthorized' });
        }

        const request = JSON.parse(event.body) as StoryGenerationRequest;

        if (!request.prompt || !request.totalPages) {
            return buildResponse(400, { error: 'Missing required fields: prompt and totalPages' });
        }

        // Generate storyId immediately
        const storyId = uuidv4();

        // Create pending story record
        await createPendingStory(userId, request, storyId);

        // Trigger async processing (fire and forget)
        processStoryAsync(storyId, userId, request).catch(err => {
            console.error('Background story generation failed:', err);
        });

        // Return immediately with storyId
        return buildResponse(202, { 
            storyId, 
            status: 'PENDING',
            message: 'Story generation started. Poll /stories/{storyId}/status to check progress.'
        });

    } catch (error) {
        console.error('Story generation error:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return buildResponse(500, { error: `Failed to start story generation: ${errorMessage}` });
    }
};

// Background processing function
async function processStoryAsync(storyId: string, userId: string, request: StoryGenerationRequest) {
    const { openAIStoryService } = await import('../../services/openaiService');
    const { updateStoryAfterGeneration } = await import('../../services/dynamodb/story');

    try {
        console.log(`[${storyId}] Starting generation...`);
        
        const generatedStory = await openAIStoryService.generateStory(request);
        
        await updateStoryAfterGeneration(userId, storyId, generatedStory);
        
        console.log(`[${storyId}] Generation complete`);
    } catch (error) {
        console.error(`[${storyId}] Generation failed:`, error);
        
        // Update status to FAILED in DB
        const { updateStoryStatus } = await import('../../services/dynamodb/story');
        await updateStoryStatus(userId, storyId, 'FAILED').catch(console.error);
    }
}