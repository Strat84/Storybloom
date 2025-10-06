import {

  openAIStoryService,import { SQSEvent } from 'aws-lambda';

  persistGeneratedStory,import { openAIStoryService } from '../../services/openaiService';

  StoryGenerationRequest,import { updateStoryAfterGeneration } from '../../services/dynamodb/story';

} from "../../services/openaiService";

import {// This function is triggered by an SQS message when a new story generation is requested.

  updateStoryStatus,export const handler = async (event: SQSEvent): Promise<void> => {

  getStory,    console.log(`Received SQS event with ${event.Records.length} records.`);

} from "../../services/dynamodb/story";

    for (const record of event.Records) {

interface ProcessGenerationEvent {        try {

  storyId: string;            const { storyId, userId, request } = JSON.parse(record.body);

  userId: string;

  request: StoryGenerationRequest;            if (!storyId || !userId || !request) {

}                throw new Error('Invalid SQS message body. Missing storyId, userId, or request.');

            }

export const handler = async (

  event: ProcessGenerationEvent            console.log(`Processing story generation for storyId: ${storyId}`);

): Promise<void> => {

  const { storyId, userId, request } = event;            // 1. Generate the story content using the OpenAI service

            const generatedStory = await openAIStoryService.generateStory(request);

  try {

    // 1. Update status to generating            // 2. Update the story record in DynamoDB with the generated content and set status to COMPLETED

    await updateStoryStatus(storyId, userId, "GENERATING");            await updateStoryAfterGeneration(userId, storyId, generatedStory);



    // 2. Generate the story content (this is the long-running task)            console.log(`Successfully generated and saved storyId: ${storyId}`);

    const generatedStory = await openAIStoryService.generateStory(request);

        } catch (error) {

    // 3. Persist the full story to DynamoDB            console.error('Error processing SQS record:', record.body, error);

    await persistGeneratedStory(generatedStory, userId, { storyId });            // Here you might want to update the story status to FAILED

            // For now, we'll just log the error.

    // 4. Update status to complete            // Consider moving the message to a Dead Letter Queue (DLQ) after several failed attempts.

    await updateStoryStatus(storyId, userId, "COMPLETE");        }

    }

    console.log(`Successfully generated and saved story ${storyId}`);};

  } catch (error) {
    console.error("Error processing story generation:", error);
    await updateStoryStatus(storyId, userId, "FAILED");
  }
};
