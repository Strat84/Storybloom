import { S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

export const getS3Client = () => {
  const resolvedRegion = process.env.AWS_REGION || "us-east-1";

  const config: any = {
    region: resolvedRegion,
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

  return new S3Client(config);
};

export const getBucketNames = () => {
  const buckets = {
    STORY_ASSETS_BUCKET: process.env.STORY_ASSETS_BUCKET,
  };

  Object.entries(buckets).forEach(([key, value]) => {
    if (key === 'STORY_ASSETS_BUCKET' && !value) {
      throw new Error(`${key} environment variable is not configured`);
    }
  });

  return buckets;
};

export const s3Config = {
  region: process.env.AWS_REGION || "us-east-1",
  signedUrlExpiration: 60 * 60,
  maxFileSize: 10 * 1024 * 1024,
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
  uploadTimeout: 30000
};

export const generateImageKey = (storyId: string, pageNumber: number, fileName: string) => {
  const timestamp = Date.now();
  return `stories/${storyId}/pages/page-${pageNumber}/${timestamp}-${fileName}`;
};

export const validateImageType = (contentType: string) => {
  return s3Config.allowedImageTypes.includes(contentType);
};

export const getFileExtension = (contentType: string) => {
  const typeMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  
  return typeMap[contentType] || 'png';
};