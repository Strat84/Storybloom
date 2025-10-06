import { getStory } from "server/services/dynamodb/story/index.js";
import { buildResponse } from "../../utils/buildResponse.js";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    console.log("Event:", event);

    // const userId = event?.requestContext?.authorizer?.claims.sub;
    const storyId = event.pathParameters?.storyId;

    // if (!userId) {
    //     console.log("No user ID found in token claims");
    //     return buildResponse(401, { message: "Unauthorized - No user ID found" });
    // }

    if (!storyId) {
        return buildResponse(400, { message: "Missing storyId in path parameters" });
    }
    const story = await getStory(storyId);

    if (!story) {
        return buildResponse(404, { message: "No story found" });
    }

    const sortedPages = story.sort((a, b) => {
        const aNo = Number(a.pageNo?.N || a.pageNo || 0);
        const bNo = Number(b.pageNo?.N || b.pageNo || 0);
        return aNo - bNo;
    });

    return buildResponse(200, { story: sortedPages });
};