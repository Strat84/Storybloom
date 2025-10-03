import { listStories } from "server/services/dynamodb/story/index.js";
import { buildResponse } from "../../utils/buildResponse.js";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    console.log("Event:", event);

    const userId = event?.requestContext?.authorizer?.claims.sub;

    if (!userId) {
        console.log("No user ID found in token claims");
        return buildResponse(401, { message: "Unauthorized - No user ID found" });
    }

    const stories = await listStories(userId);
    if (!stories) {
        return buildResponse(404, { message: "No stories found for user" });
    }
    return buildResponse(200, { stories });
};