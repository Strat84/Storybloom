"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const openaiService_1 = require("../../services/openaiService");
const story_1 = require("../../services/dynamodb/story");
// This function is triggered by an SQS message when a new story generation is requested.
const handler = async (event) => {
    console.log(`Received SQS event with ${event.Records.length} records.`);
    for (const record of event.Records) {
        let storyId;
        let userId;
        try {
            const { storyId: parsedStoryId, userId: parsedUserId, request } = JSON.parse(record.body);
            storyId = parsedStoryId;
            userId = parsedUserId;
            if (!storyId || !userId || !request) {
                throw new Error('Invalid SQS message body. Missing storyId, userId, or request.');
            }
            console.log(`Processing story generation for storyId: ${storyId}`);
            // 1. Update status to generating
            await (0, story_1.updateStoryStatus)(storyId, userId, "GENERATING");
            // 2. Generate the story content using the OpenAI service
            const generatedStory = await openaiService_1.openAIStoryService.generateStory(request);
            // 3. Update the story record in DynamoDB with the generated content and set status to COMPLETED
            await (0, story_1.updateStoryAfterGeneration)(userId, storyId, generatedStory);
            console.log(`Successfully generated and saved storyId: ${storyId}`);
        }
        catch (error) {
            console.error('Error processing SQS record:', record.body, error);
            if (storyId && userId) {
                try {
                    await (0, story_1.updateStoryStatus)(storyId, userId, "FAILED");
                    console.log(`Set status to FAILED for storyId: ${storyId}`);
                }
                catch (updateError) {
                    console.error(`Failed to update status to FAILED for storyId: ${storyId}`, updateError);
                }
            }
            // Consider moving the message to a Dead Letter Queue (DLQ) after several failed attempts.
        }
    }
};
exports.handler = handler;
