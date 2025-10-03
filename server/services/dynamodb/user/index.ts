import {
  GetCommand,
  UpdateCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { generateUpdateQuery } from "../generateUpdateQuery.js";
import { getDynamoDBClient, getTableNames } from "server/config/database.js";

const dynamoDB = getDynamoDBClient();
const { USERS_TABLE } = getTableNames();

export const getUser = async (userId: string) => {
  const params = new GetCommand({
    TableName: USERS_TABLE,
    Key: {
      id: userId,
    },
  });

  const { Item } = await dynamoDB.send(params);
  return Item;
};

export const createUser = async (item: Record<string, unknown>) => {
  const params = new PutCommand({
    TableName: USERS_TABLE,
    Item: item,
  });

  await dynamoDB.send(params);
};

export const updateUser = async (userId: string, data: Record<string, unknown>) => {
  const params = new UpdateCommand({
    TableName: USERS_TABLE,
    Key: {
      id: userId,
    },
    ...generateUpdateQuery(data),
    ReturnValues: "ALL_NEW",
  });

  const { Attributes } = await dynamoDB.send(params);
  return Attributes;
};

export const getUserByCognitoId = async (cognitoUserId: string) => {
  const params = {
    TableName: USERS_TABLE,
    IndexName: "cognitoUserId-index",
    KeyConditionExpression: "cognitoUserId = :cognitoUserId",
    ExpressionAttributeValues: {
      ":cognitoUserId": cognitoUserId
    }
  };

  const result = await dynamoDB.send(new QueryCommand(params));
  return result.Items;
};



