import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { UploadStoryImageInput } from "server/types/uploadStoryImageInput";
import { UploadStoryImageResult } from "server/types/uploadStoryImageResult";
import { 
  getS3Client, 
  getBucketNames, 
  s3Config, 
  generateImageKey,
  validateImageType,
  getFileExtension
} from "../../config/bucket.js";

const s3Client = getS3Client();

export const uploadStoryImage = async (
  input: UploadStoryImageInput,
): Promise<UploadStoryImageResult> => {
  const { STORY_ASSETS_BUCKET } = getBucketNames();

  if (!STORY_ASSETS_BUCKET) {
    throw new Error("STORY_ASSETS_BUCKET is not configured");
  }

  if (!validateImageType(input.contentType)) {
    throw new Error(`Unsupported image type: ${input.contentType}`);
  }

  if (input.buffer.length > s3Config.maxFileSize) {
    throw new Error(`File too large. Maximum size: ${s3Config.maxFileSize / 1024 / 1024}MB`);
  }

  const extension = getFileExtension(input.contentType);
  const fileName = input.fileName.includes('.') ? input.fileName : `${input.fileName}.${extension}`;
  
  const key = generateImageKey(input.storyId, input.pageNumber, fileName);
  
  console.log(`Uploading image to S3 with key: ${key}`);

  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: STORY_ASSETS_BUCKET,
        Key: key,
        Body: input.buffer,
        ContentType: input.contentType,
        Metadata: {
          storyId: input.storyId,
          pageNumber: input.pageNumber.toString(),
          uploadedAt: new Date().toISOString(),
        },
      }),
    );

    const signedUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: STORY_ASSETS_BUCKET,
        Key: key,
      }),
      { expiresIn: s3Config.signedUrlExpiration },
    );
    
    console.log(`Generated signed URL for key: ${key}`);

    return { key, signedUrl };
  } catch (error) {
    console.error(`Failed to upload image to S3:`, error);
    throw new Error(`S3 upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const getImageSignedUrl = async (key: string): Promise<string> => {
  const { STORY_ASSETS_BUCKET } = getBucketNames();

  if (!STORY_ASSETS_BUCKET) {
    throw new Error("STORY_ASSETS_BUCKET is not configured");
  }

  try {
    const signedUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: STORY_ASSETS_BUCKET,
        Key: key,
      }),
      { expiresIn: s3Config.signedUrlExpiration },
    );

    return signedUrl;
  } catch (error) {
    console.error(`Failed to generate signed URL for key: ${key}`, error);
    throw new Error(`Failed to generate signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const deleteStoryImage = async (key: string): Promise<void> => {
  const { STORY_ASSETS_BUCKET } = getBucketNames();

  if (!STORY_ASSETS_BUCKET) {
    throw new Error("STORY_ASSETS_BUCKET is not configured");
  }

  try {
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: STORY_ASSETS_BUCKET,
        Key: key,
      }),
    );

    console.log(`Deleted image from S3 with key: ${key}`);
  } catch (error) {
    console.error(`Failed to delete image from S3:`, error);
    throw new Error(`S3 delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
