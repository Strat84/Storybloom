import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { geminiImageService } from '../../services/geminiService';
import { getStoryPageItem, updatePageImageMetadata, updatePageImageGenerationStatus } from '../../services/dynamodb/story';
import { uploadStoryImage } from '../../services/s3/s3Service';
import { evaluateGenerationLimit, GenerationLimitError } from '../../services/generationLimits';
import { v4 as uuidv4 } from 'uuid';
import { buildResponse } from '../../utils/buildResponse';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { storyId, pageNumber } = event.pathParameters as { storyId: string; pageNumber: string };
    const pageNumberInt = parseInt(pageNumber, 10);

    try {
        const pageData = await getStoryPageItem(storyId, pageNumberInt);
        if (!pageData) {
            return buildResponse(404, { error: 'Page not found' });
        }

        const jobId = uuidv4();

        await updatePageImageGenerationStatus(storyId, pageNumberInt, 'PENDING', jobId);

        // Trigger async processing
        processImageAsync(storyId, pageNumberInt, jobId).catch(err => {
            console.error('Background image generation failed:', err);
            updatePageImageGenerationStatus(storyId, pageNumberInt, 'FAILED', jobId);
        });

        return buildResponse(202, {
            jobId,
            status: 'PENDING',
            message: 'Image generation started. Poll /stories/{storyId}/pages/{pageNumber}/image-status to check progress.'
        });

    } catch (error) {
        console.error('Start image generation error:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return buildResponse(500, { error: `Failed to start image generation: ${errorMessage}` });
    }
};

async function processImageAsync(storyId: string, pageNumber: number, jobId: string) {
    try {
        const pageData = await getStoryPageItem(storyId, pageNumber);
        console.log('DynamoDB metadata for page:', pageData);
        if (!pageData) {
            throw new Error('Page not found');
        }

        const imagePrompt = pageData.imageDescription as string;
        if (!imagePrompt) {
            throw new Error('Image prompt not found for this page');
        }

        let generationPlan;
        try {
            if (!process.env.STORIES_TABLE) {
                throw new Error('STORIES_TABLE environment variable is not set');
            }
            generationPlan = evaluateGenerationLimit(pageData);
        } catch (limitError) {
            if (limitError instanceof GenerationLimitError) {
                throw limitError;
            }
            console.error('Failed to evaluate generation limits:', limitError);
            throw new Error('Unable to validate image generation limits');
        }

        // Generate image with context from previous pages
        console.log(`Generating image for story ${storyId}, page ${pageNumber} with context`);
        const generatedImage = await geminiImageService.generateImage({
            prompt: imagePrompt,
            enhancePrompt: true,
            storyId: storyId,
            pageNumber: pageNumber,
        });

        let imageUrlToPersist = generatedImage.imageUrl;
        let uploadedKey: string | undefined;

        if (process.env.STORY_ASSETS_BUCKET) {
            try {
                let extension = 'png';
                if (generatedImage.contentType) {
                    if (generatedImage.contentType === 'image/jpeg') extension = 'jpg';
                    else if (generatedImage.contentType === 'image/webp') extension = 'webp';
                    else if (generatedImage.contentType === 'image/png') extension = 'png';
                }
                const fileName = `${storyId}_${pageNumber}.${extension}`;
                const uploadResult = await uploadStoryImage({
                    storyId: storyId,
                    pageNumber: pageNumber,
                    buffer: generatedImage.imageBuffer,
                    contentType: generatedImage.contentType,
                    fileName,
                });

                imageUrlToPersist = uploadResult.signedUrl;
                uploadedKey = uploadResult.key;
                console.log(`Image uploaded to S3: ${uploadedKey}`);
            } catch (uploadError) {
                console.error('Failed to upload generated image to S3:', uploadError);
                throw new Error('Unable to store generated image');
            }
        }

        if (process.env.STORIES_TABLE && uploadedKey) {
            try {
                await updatePageImageMetadata({
                    storyId: storyId,
                    pageNumber: pageNumber,
                    imageUrl: imageUrlToPersist,
                    imageKey: uploadedKey,
                    imageGenerationCount: generationPlan.nextCount,
                    imageGenerationDate: generationPlan.generationDate,
                    lastImageGeneratedAt: generationPlan.lastGeneratedAtIso,
                    jobId: jobId,
                });
                console.log(`DynamoDB metadata updated for page ${pageNumber}`);
            } catch (dynamoUpdateError) {
                console.error('Failed to update DynamoDB metadata for story page image:', dynamoUpdateError);
                // non-fatal, continue
            }
        }

        console.log(`Image generation completed successfully for page ${pageNumber}`);
    } catch (error) {
        console.error('Generate image error:', error);
        await updatePageImageGenerationStatus(storyId, pageNumber, 'FAILED', jobId);
        throw error;
    }
}