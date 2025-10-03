import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import dotenv from "dotenv";

dotenv.config();

export const getDynamoDBClient = () => {
  const config: any = {
    region: process.env.AWS_REGION || "us-east-1",
  };

  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    config.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      ...(process.env.AWS_SESSION_TOKEN && {
        sessionToken: process.env.AWS_SESSION_TOKEN,
      }),
    };
  }

  return new DynamoDBClient(config);
};

export const getTableNames = () => {
  const tables = {
    STORIES_TABLE: process.env.STORIES_TABLE,
    USERS_TABLE: process.env.USERS_TABLE,
  };

  Object.entries(tables).forEach(([key, value]) => {
    if (!value) {
      throw new Error(`${key} environment variable is not configured`);
    }
  });

  return tables as Record<keyof typeof tables, string>;
};