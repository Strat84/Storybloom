import {
  BatchWriteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { generateUpdateQuery } from "../generateUpdateQuery.js";
import { PageImageMetadataInput } from "server/types/pageImageMetadataInput.js";
import { EditStoryInput } from "server/types/editStoryInput.js";
import { getDynamoDBClient, getTableNames } from "server/config/database.js";
import { StoryGenerationRequest } from "server/services/openaiService.js";

const dynamoDB = getDynamoDBClient();
const { STORIES_TABLE } = getTableNames();

export const getStory = async (storyId: string) => {
  const params = {
    TableName: STORIES_TABLE,
    KeyConditionExpression: "pk = :pk AND begins_with(sk, :skPrefix)",
    ExpressionAttributeValues: {
      ":pk": `story#${storyId}`,
      ":skPrefix": "page#"
    }
  };

  const result = await dynamoDB.send(new QueryCommand(params));
  return result.Items;
};

export const createStory = async (
  userId: string,
  title: string,
  pages: { text: string; imageDescription: string; pageId?: string }[],
  storyId?: string
): Promise<string> => {
  let finalStoryId = storyId;
  if (!finalStoryId) {
    const { v4: uuidv4 } = await import("uuid");
    finalStoryId = uuidv4();
  }
  const createdAt = Date.now();

  const storyInfoItem = {
    pk: `user#${userId}`,
    sk: `story#info#${finalStoryId}`,
    storyId: finalStoryId,
    userId,
    title,
    createdAt,
  };

  await dynamoDB.send(
    new PutCommand({
      TableName: STORIES_TABLE,
      Item: storyInfoItem,
      ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
    }),
  );

  if (pages.length === 0) {
    return finalStoryId;
  }

  const writeRequests = pages.map((page, idx) => {
    const finalPageId = page.pageId || (() => {
      const { v4: uuidv4 } = require("uuid");
      return uuidv4();
    })();

    return {
      PutRequest: {
        Item: {
          pk: `story#${finalStoryId}`,
          sk: `page#${idx + 1}`,
          pageId: finalPageId,
          storyId: finalStoryId,
          pageNo: idx + 1,
          text: page.text,
          imageDescription: page.imageDescription,
          createdAt,
        },
      },
    };
  });

  for (let i = 0; i < writeRequests.length; i += 25) {
    let unprocessed = writeRequests.slice(i, i + 25);
    let retryCount = 0;

    while (unprocessed.length > 0) {
      const batch = new BatchWriteCommand({
        RequestItems: {
          [STORIES_TABLE]: unprocessed,
        },
      });

      const response = await dynamoDB.send(batch);
      const nextUnprocessed = (response.UnprocessedItems?.[STORIES_TABLE] as typeof writeRequests | undefined) ?? [];

      if (nextUnprocessed.length === 0) {
        break;
      }

      retryCount += 1;
      if (retryCount >= 5) {
        throw new Error("Failed to persist all story pages after multiple retries");
      }

      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(50 * 2 ** retryCount, 1000)),
      );

      unprocessed = nextUnprocessed;
    }
  }

  return finalStoryId;
};

export const updateStory = async (storyId: string, data: Record<string, unknown>) => {
  const params = new UpdateCommand({
    TableName: STORIES_TABLE,
    Key: {
      id: storyId,
    },
    ...generateUpdateQuery(data),
    ReturnValues: "ALL_NEW",
  });

  const { Attributes } = await dynamoDB.send(params);
  return Attributes;
};

export const listStories = async (userId: string) => {
  const params = {
    TableName: STORIES_TABLE,
    KeyConditionExpression: "pk = :pk AND begins_with(sk, :skPrefix)",
    ExpressionAttributeValues: {
      ":pk": `user#${userId}`,
      ":skPrefix": "story#info#"
    }
  };

  const result = await dynamoDB.send(new QueryCommand(params));
  return result.Items;
};

export const getStoryPageItem = async (storyId: string, pageNumber: number) => {
  const tableName = STORIES_TABLE;
  const command = new GetCommand({
    TableName: tableName,
    Key: {
      pk: `story#${storyId}`,
      sk: `page#${pageNumber}`,
    },
  });

  const { Item } = await dynamoDB.send(command);
  return Item ?? null;
};

export const getStoryPageByPageId = async (storyId: string, pageId: string) => {
  const tableName = STORIES_TABLE;

  // Query all pages of the story and find by pageId
  const params = {
    TableName: tableName,
    KeyConditionExpression: "pk = :pk AND begins_with(sk, :skPrefix)",
    FilterExpression: "pageId = :pageId",
    ExpressionAttributeValues: {
      ":pk": `story#${storyId}`,
      ":skPrefix": "page#",
      ":pageId": pageId
    }
  };

  const result = await dynamoDB.send(new QueryCommand(params));
  return result.Items && result.Items.length > 0 ? result.Items[0] : null;
};

export const updatePageImageMetadata = async (
  input: PageImageMetadataInput,
) => {
  const tableName = STORIES_TABLE;

  const imageMetadataData = {
    imageUrl: input.imageUrl,
    imageKey: input.imageKey,
    imageGenerationCount: input.imageGenerationCount,
    imageGenerationDate: input.imageGenerationDate,
    lastImageGeneratedAt: input.lastImageGeneratedAt,
    imageGenerationStatus: 'COMPLETED', // Atomically update status
    imageGenerationJobId: input.jobId, // Ensure jobId is also set
  };

  const updateQuery = generateUpdateQuery(imageMetadataData);

  const command = new UpdateCommand({
    TableName: tableName,
    Key: {
      pk: `story#${input.storyId}`,
      sk: `page#${input.pageNumber}`,
    },
    ...updateQuery,
    ReturnValues: "ALL_NEW",
  });

  const { Attributes } = await dynamoDB.send(command);
  return Attributes;
};

export const editStory = async (input: EditStoryInput) => {
  const tableName = STORIES_TABLE;
  const { storyId, userId, title, pages } = input;

  if (title) {
    const storyUpdateData = { title };
    const updateQuery = generateUpdateQuery(storyUpdateData);

    await dynamoDB.send(
      new UpdateCommand({
        TableName: tableName,
        Key: {
          pk: `user#${userId}`,
          sk: `story#info#${storyId}`,
        },
        ...updateQuery,
        ReturnValues: "ALL_NEW",
      })
    );
  }

  if (pages && pages.length > 0) {
    for (const page of pages) {
      const pageUpdateData: Record<string, any> = {};

      if (page.text !== undefined) {
        pageUpdateData.text = page.text;
      }

      if (page.imagePrompt !== undefined) {
        pageUpdateData.imageDescription = page.imagePrompt; // Fix: use imageDescription in DB
      }

      if (Object.keys(pageUpdateData).length > 0) {
        const updateQuery = generateUpdateQuery(pageUpdateData);

        await dynamoDB.send(
          new UpdateCommand({
            TableName: tableName,
            Key: {
              pk: `story#${storyId}`,
              sk: `page#${page.pageNumber}`,
            },
            ...updateQuery,
            ReturnValues: "ALL_NEW",
          })
        );
      }
    }
  }

  return { success: true, storyId };
};

export const getStoryWithStatus = async (storyId: string) => {
  const storyInfoParams = {
    TableName: STORIES_TABLE,
    KeyConditionExpression: "pk = :pk AND sk = :sk",
    ExpressionAttributeValues: {
      ":pk": `story#${storyId}`,
      ":sk": "info",
    },
  };

  const storyInfoResult = await dynamoDB.send(new QueryCommand(storyInfoParams));
  const storyInfo = storyInfoResult.Items?.[0];

  if (!storyInfo) {
    return null;
  }

  if (storyInfo.status === "COMPLETED") {
    const storyPages = await getStory(storyId);
    return { ...storyInfo, pages: storyPages };
  }

  return storyInfo;
};

export const createPendingStory = async (
  userId: string,
  request: StoryGenerationRequest,
  storyId: string
) => {
  const createdAt = Date.now();

  const storyInfoItem = {
    pk: `user#${userId}`,
    sk: `story#info#${storyId}`,
    storyId: storyId,
    userId,
    title: request.prompt, // Use prompt as a temporary title
    status: "PENDING",
    createdAt,
  };

  await dynamoDB.send(
    new PutCommand({
      TableName: STORIES_TABLE,
      Item: storyInfoItem,
    })
  );

  const storyDetailsItem = {
    pk: `story#${storyId}`,
    sk: "info",
    storyId: storyId,
    userId,
    title: request.prompt,
    status: "PENDING",
    createdAt,
  };

  await dynamoDB.send(
    new PutCommand({
      TableName: STORIES_TABLE,
      Item: storyDetailsItem,
    })
  );
};



export const updateStoryAfterGeneration = async (
  userId: string,
  storyId: string,
  generatedStory: { title: string; pages: { text: string; imageDescription: string }[] }
) => {
  const { title, pages } = generatedStory;
  const updatedAt = Date.now();

  // Update story info for user
  await dynamoDB.send(
    new UpdateCommand({
      TableName: STORIES_TABLE,
      Key: {
        pk: `user#${userId}`,
        sk: `story#info#${storyId}`,
      },
      UpdateExpression: "SET title = :title, #status = :status, updatedAt = :updatedAt",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":title": title,
        ":status": "COMPLETED",
        ":updatedAt": updatedAt,
      },
    })
  );

  // Update story details
  await dynamoDB.send(
    new UpdateCommand({
      TableName: STORIES_TABLE,
      Key: {
        pk: `story#${storyId}`,
        sk: "info",
      },
      UpdateExpression: "SET title = :title, #status = :status, updatedAt = :updatedAt",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":title": title,
        ":status": "COMPLETED",
        ":updatedAt": updatedAt,
      },
    })
  );

  const writeRequests = pages.map((page, idx) => {
    const { v4: uuidv4 } = require("uuid");
    const finalPageId = uuidv4();

    return {
      PutRequest: {
        Item: {
          pk: `story#${storyId}`,
          sk: `page#${idx + 1}`,
          pageId: finalPageId,
          storyId: storyId,
          pageNo: idx + 1,
          text: page.text,
          imageDescription: page.imageDescription,
          createdAt: updatedAt,
        },
      },
    };
  });

  for (let i = 0; i < writeRequests.length; i += 25) {
    let unprocessed = writeRequests.slice(i, i + 25);
    let retryCount = 0;

    while (unprocessed.length > 0) {
      const batch = new BatchWriteCommand({
        RequestItems: {
          [STORIES_TABLE]: unprocessed,
        },
      });

      const response = await dynamoDB.send(batch);
      const nextUnprocessed = (response.UnprocessedItems?.[STORIES_TABLE] as typeof writeRequests | undefined) ?? [];

      if (nextUnprocessed.length === 0) {
        break;
      }

      retryCount += 1;
      if (retryCount >= 5) {
        throw new Error("Failed to persist all story pages after multiple retries");
      }

      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(50 * 2 ** retryCount, 1000)),
      );

      unprocessed = nextUnprocessed;
    }
  }
};

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

export const updatePageImageGenerationStatus = async (
  storyId: string,
  pageNumber: number,
  status: 'PENDING' | 'COMPLETED' | 'FAILED',
  jobId?: string
) => {
  const tableName = STORIES_TABLE;
  const updateData: Record<string, any> = {
    imageGenerationStatus: status,
  };

  if (jobId) {
    updateData.imageGenerationJobId = jobId;
  }

  const updateQuery = generateUpdateQuery(updateData);

  const command = new UpdateCommand({
    TableName: tableName,
    Key: {
      pk: `story#${storyId}`,
      sk: `page#${pageNumber}`,
    },
    ...updateQuery,
    ReturnValues: "ALL_NEW",
  });

  const { Attributes } = await dynamoDB.send(command);
  return Attributes;
};