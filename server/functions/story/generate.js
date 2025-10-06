"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const buildResponse_1 = require("../../utils/buildResponse");
const extractUserIdFromToken_1 = require("../../utils/extractUserIdFromToken");
const story_1 = require("../../services/dynamodb/story");
const uuid_1 = require("uuid");
const handler = async (event) => {
    try {
        if (!event.body) {
            return (0, buildResponse_1.buildResponse)(400, { error: 'Missing request body' });
        }
        const userId = (0, extractUserIdFromToken_1.extractUserIdFromToken)(event.headers.Authorization);
        if (!userId) {
            return (0, buildResponse_1.buildResponse)(401, { error: 'Unauthorized' });
        }
        const request = JSON.parse(event.body);
        if (!request.prompt || !request.totalPages) {
            return (0, buildResponse_1.buildResponse)(400, { error: 'Missing required fields: prompt and totalPages' });
        }
        // Generate storyId immediately
        const storyId = (0, uuid_1.v4)();
        // Create pending story record
        await (0, story_1.createPendingStory)(userId, request, storyId);
        // Trigger async processing (fire and forget)
        processStoryAsync(storyId, userId, request).catch(err => {
            console.error('Background story generation failed:', err);
        });
        // Return immediately with storyId
        return (0, buildResponse_1.buildResponse)(202, {
            storyId,
            status: 'PENDING',
            message: 'Story generation started. Poll /stories/{storyId}/status to check progress.'
        });
    }
    catch (error) {
        console.error('Story generation error:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return (0, buildResponse_1.buildResponse)(500, { error: `Failed to start story generation: ${errorMessage}` });
    }
};
exports.handler = handler;
// Background processing function
async function processStoryAsync(storyId, userId, request) {
    const { openAIStoryService } = await Promise.resolve().then(() => require('../../services/openaiService'));
    const { updateStoryAfterGeneration } = await Promise.resolve().then(() => require('../../services/dynamodb/story'));
    try {
        console.log(`[${storyId}] Starting generation...`);
        const generatedStory = await openAIStoryService.generateStory(request);
        await updateStoryAfterGeneration(userId, storyId, generatedStory);
        console.log(`[${storyId}] Generation complete`);
    }
    catch (error) {
        console.error(`[${storyId}] Generation failed:`, error);
        // Update status to FAILED in DB
        const { updateStoryStatus } = await Promise.resolve().then(() => require('../../services/dynamodb/story'));
        await updateStoryStatus(userId, storyId, 'FAILED').catch(console.error);
    }
}
