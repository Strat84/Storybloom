// Add these functions to your existing story.ts file

import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { getDynamoDBClient, getTableNames } from "server/config/database.js";

const dynamoDB = getDynamoDBClient();
const { STORIES_TABLE } = getTableNames();

// Get story status for polling
export const getStoryStatus = async (userId: string, storyId: string) => {
  const params = {
    TableName: STORIES_TABLE,
    Key: {
      pk: `user#${userId}`,
      sk: `story#info#${storyId}`,
    },
  };

  const result = await dynamoDB.send(new GetCommand(params));
  return result.Item || null;
};

// Update story status
export const updateStoryStatus = async (
  userId: string,
  storyId: string, 
  status: 'PENDING' | 'COMPLETED' | 'FAILED'
) => {
  await dynamoDB.send(
    new UpdateCommand({
      TableName: STORIES_TABLE,
      Key: {
        pk: `user#${userId}`,
        sk: `story#info#${storyId}`,
      },
      UpdateExpression: "SET #status = :status, updatedAt = :updatedAt",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":status": status,
        ":updatedAt": Date.now(),
      },
    })
  );
};