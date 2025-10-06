"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const story_1 = require("../../services/dynamodb/story");
const buildResponse_1 = require("../../utils/buildResponse");
const extractUserIdFromToken_1 = require("../../utils/extractUserIdFromToken");
// This function is polled by the client to check the status of a story generation.
const handler = async (event) => {
    try {
        const userId = (0, extractUserIdFromToken_1.extractUserIdFromToken)(event);
        if (!userId) {
            return (0, buildResponse_1.buildResponse)(401, { error: 'Unauthorized' });
        }
        const storyId = event.pathParameters?.storyId;
        if (!storyId) {
            return (0, buildResponse_1.buildResponse)(400, { error: 'Missing storyId path parameter' });
        }
        console.log(`Checking status for storyId: ${storyId}, userId: ${userId}`);
        const story = await (0, story_1.getStoryStatus)(userId, storyId);
        if (!story) {
            return (0, buildResponse_1.buildResponse)(404, { error: 'Story not found or access denied' });
        }
        return (0, buildResponse_1.buildResponse)(200, {
            storyId: story.storyId,
            status: story.generationStatus,
            title: story.title, // Also return title if available
        });
    }
    catch (error) {
        console.error('Error getting story status:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return (0, buildResponse_1.buildResponse)(500, { error: `Failed to get story status: ${errorMessage}` });
    }
};
exports.handler = handler;
