import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { buildResponse } from "../../utils/buildResponse";
import { createStory } from "server/services/dynamodb/story";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log("Received event:", event);
  try {
    const userId = event.requestContext?.authorizer?.claims?.sub;
    console.log("Resolved user ID:", userId);

    if (!userId) {
      return buildResponse(401, { message: "User ID not found in request" });
    }

    const { storyId, title, pages, pageId } = JSON.parse(event.body || "{}");
    console.log("Parsed body:", { storyId, title, pages, pageId });

    if (!title || !Array.isArray(pages) || pages.length === 0) {
      return buildResponse(400, { message: "Title and pages are required" });
    }

    const createdStoryId = await createStory(userId, title, pages, storyId);
    console.log("Story created with ID:", createdStoryId);

    return buildResponse(201, { message: "Story saved", storyId: createdStoryId });
  } catch (error) {
    console.error("Error saving story:", error);
    return buildResponse(500, { message: "Internal server error" });
  }
};
