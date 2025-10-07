import * as path from "path";
import * as fs from "fs";
import { GoogleGenAI, Modality } from "@google/genai";
import { getStory } from "./dynamodb/story";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// S3 Client
const s3Client = new S3Client({ region: process.env.AWS_REGION_NAME || "us-east-1" });

export interface ImageGenerationRequest {
  prompt: string;
  enhancePrompt?: boolean;
  storyId: string;
  pageNumber: number;
}

export interface GeneratedImage {
  imageUrl: string;
  prompt: string;
  imageBuffer: Buffer;
  contentType: string;
  fileName: string;
}

export const GENERATED_IMAGES_DIR = process.env.GENERATED_IMAGES_DIR
  ? path.resolve(process.env.GENERATED_IMAGES_DIR)
  : path.join(process.cwd(), "tmp", "generated-images");

/**
 * Interface for conversation history parts
 */
interface ContentPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string; // base64 encoded
  };
}

interface ConversationMessage {
  role: "user" | "model";
  parts: ContentPart[];
}

export class GeminiImageService {
  /**
   * Fetch image from S3 and convert to base64
   */
  private async getImageFromS3(imageKey: string): Promise<{ data: string; mimeType: string } | null> {
    try {
      const command = new GetObjectCommand({
        Bucket: process.env.STORY_ASSETS_BUCKET,
        Key: imageKey,
      });

      const response = await s3Client.send(command);
      
      if (!response.Body) {
        console.error(`No body in S3 response for key: ${imageKey}`);
        return null;
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      const base64Data = buffer.toString("base64");

      // Determine mime type from ContentType or file extension
      let mimeType = response.ContentType || "image/png";
      if (!mimeType.startsWith("image/")) {
        const ext = path.extname(imageKey).toLowerCase();
        if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg";
        else if (ext === ".webp") mimeType = "image/webp";
        else mimeType = "image/png";
      }

      return { data: base64Data, mimeType };
    } catch (error) {
      console.error(`Failed to fetch image from S3: ${imageKey}`, error);
      return null;
    }
  }

  /**
   * Build conversation history from previous pages (max 4 previous pages)
   */
  private async buildConversationHistory(
    storyId: string,
    currentPageNumber: number
  ): Promise<ConversationMessage[]> {
    try {
      // Fetch all story pages
      const allPages = await getStory(storyId);
      
      if (!allPages || allPages.length === 0) {
        console.log("No pages found for story");
        return [];
      }

      // Sort pages by page number
      const sortedPages = allPages
        .filter((page: any) => page.pageNo < currentPageNumber) // Only previous pages
        .sort((a: any, b: any) => a.pageNo - b.pageNo);

      // Get last 4 pages maximum
      const MAX_CONTEXT_PAGES = 4;
      const contextPages = sortedPages.slice(-MAX_CONTEXT_PAGES);

      console.log(`Building context from ${contextPages.length} previous pages`);

      const history: ConversationMessage[] = [];

      for (const page of contextPages) {
        // Add user message (the prompt that generated this page's image)
        if (page.imageDescription) {
          const userMessage: ConversationMessage = {
            role: "user",
            parts: [{ text: page.imageDescription }],
          };
          history.push(userMessage);

          // Add model response (the generated image) if available
          if (page.imageUrl && page.imageKey) {
            const imageData = await this.getImageFromS3(page.imageKey);
            
            if (imageData) {
              const modelMessage: ConversationMessage = {
                role: "model",
                parts: [
                  { text: `Here's the illustration for page ${page.pageNo}` },
                  {
                    inlineData: {
                      mimeType: imageData.mimeType,
                      data: imageData.data,
                    },
                  },
                ],
              };
              history.push(modelMessage);
              console.log(`Added page ${page.pageNo} to context`);
            } else {
              console.warn(`Could not fetch image for page ${page.pageNo}, skipping from context`);
            }
          } else {
            console.log(`Page ${page.pageNo} has no image, skipping from context`);
          }
        }
      }

      console.log(`Built conversation history with ${history.length} messages`);
      return history;
    } catch (error) {
      console.error("Error building conversation history:", error);
      return [];
    }
  }

  /**
   * Generate image with conversation context from previous pages
   */
  async generateImage(request: ImageGenerationRequest): Promise<GeneratedImage> {
    const { prompt, enhancePrompt = true, storyId, pageNumber } = request;
    
    // Enhance the prompt if needed
    const enhancedPrompt = enhancePrompt ? this.enhanceImagePrompt(prompt) : prompt;
    
    try {
      // Ensure output directory exists
      if (!fs.existsSync(GENERATED_IMAGES_DIR)) {
        fs.mkdirSync(GENERATED_IMAGES_DIR, { recursive: true });
      }

      const fileName = `story-image-${Date.now()}.png`;
      const imagePath = path.join(GENERATED_IMAGES_DIR, fileName);

      // Build conversation history from previous pages
      const conversationHistory = await this.buildConversationHistory(storyId, pageNumber);

      // Build the contents array with history + current prompt
      const contents: any[] = [];
      
      // Add conversation history
      if (conversationHistory.length > 0) {
        conversationHistory.forEach(msg => {
          contents.push({
            role: msg.role,
            parts: msg.parts,
          });
        });
        console.log(`Using ${conversationHistory.length} historical messages for context`);
      }

      // Add current user prompt
      contents.push({
        role: "user",
        parts: [{ text: enhancedPrompt }],
      });

      // Generate image with context
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash-preview-image-generation",
        contents: contents,
        config: {
          responseModalities: [Modality.TEXT, Modality.IMAGE],
        },
      });

      const candidates = response.candidates;
      if (!candidates || candidates.length === 0) {
        throw new Error("No image generated from Gemini");
      }

      const content = candidates[0].content;
      if (!content || !content.parts) {
        throw new Error("No content parts in Gemini response");
      }

      let inlineImage: { buffer: Buffer; contentType: string } | undefined;
      for (const part of content.parts) {
        if (part.inlineData && part.inlineData.data) {
          const imageData = Buffer.from(part.inlineData.data, "base64");
          const mimeType = part.inlineData.mimeType || "image/png";
          fs.writeFileSync(imagePath, imageData);
          inlineImage = { buffer: imageData, contentType: mimeType };
          console.log(`Story image saved as ${imagePath}`);
          break;
        }
      }

      if (!inlineImage) {
        throw new Error("No image data found in Gemini response");
      }

      return {
        imageUrl: `/api/images/${fileName}`,
        prompt: enhancedPrompt,
        imageBuffer: inlineImage.buffer,
        contentType: inlineImage.contentType,
        fileName
      };

    } catch (error) {
      console.error("Gemini image generation error:", error);
      throw new Error(`Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private enhanceImagePrompt(originalPrompt: string): string {
    // Add consistent styling and quality improvements for children's book illustrations
    const enhancements = [
      "Colorful children's book illustration style",
      "warm and inviting atmosphere",
      "soft lighting",
      "friendly and approachable characters",
      "bright cheerful colors",
      "detailed but not overwhelming",
      "age-appropriate and magical",
      "high quality digital art"
    ];

    // Check if prompt already mentions children's book style
    const hasBookStyle = originalPrompt.toLowerCase().includes('children\'s book') || 
                        originalPrompt.toLowerCase().includes('storybook') ||
                        originalPrompt.toLowerCase().includes('illustration');

    if (hasBookStyle) {
      // Just add quality enhancements
      return `${originalPrompt}, ${enhancements.slice(1).join(', ')}`;
    } else {
      // Add full enhancement
      return `${originalPrompt}, ${enhancements.join(', ')}`;
    }
  }

  async regenerateImage(
    originalPrompt: string, 
    customInstructions?: string,
    storyId?: string,
    pageNumber?: number
  ): Promise<GeneratedImage> {
    let modifiedPrompt = originalPrompt;
    
    if (customInstructions) {
      modifiedPrompt = `${originalPrompt}. Additional instructions: ${customInstructions}`;
    }

    if (!storyId || !pageNumber) {
      throw new Error("storyId and pageNumber are required for regeneration with context");
    }

    return this.generateImage({ 
      prompt: modifiedPrompt, 
      enhancePrompt: true,
      storyId,
      pageNumber
    });
  }
}

export const geminiImageService = new GeminiImageService();