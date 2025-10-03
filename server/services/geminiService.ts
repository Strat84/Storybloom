import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { GoogleGenAI, Modality } from "@google/genai";

// DON'T DELETE THIS COMMENT
// Follow these instructions when using this blueprint:
// - Note that the newest Gemini model series is "gemini-2.5-flash" or gemini-2.5-pro"
//   - do not change this unless explicitly requested by the user

// This API key is from Gemini Developer API Key, not vertex AI API Key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface ImageGenerationRequest {
  prompt: string;
  enhancePrompt?: boolean;
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
  : path.join(os.tmpdir(), "generated-images");

export class GeminiImageService {
  async generateImage(request: ImageGenerationRequest): Promise<GeneratedImage> {
    const { prompt, enhancePrompt = true } = request;
    
    // Enhance the prompt for better children's book style images
    const enhancedPrompt = enhancePrompt ? this.enhanceImagePrompt(prompt) : prompt;
    
    try {
      if (!fs.existsSync(GENERATED_IMAGES_DIR)) {
        fs.mkdirSync(GENERATED_IMAGES_DIR, { recursive: true });
      }

      const fileName = `story-image-${Date.now()}.png`;
      const imagePath = path.join(GENERATED_IMAGES_DIR, fileName);

      // IMPORTANT: only this gemini model supports image generation
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash-preview-image-generation",
        contents: [{ role: "user", parts: [{ text: enhancedPrompt }] }],
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

      // Return the file path that can be served by the static middleware
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

  async regenerateImage(originalPrompt: string, customInstructions?: string): Promise<GeneratedImage> {
    let modifiedPrompt = originalPrompt;
    
    if (customInstructions) {
      modifiedPrompt = `${originalPrompt}. Additional instructions: ${customInstructions}`;
    }

    return this.generateImage({ 
      prompt: modifiedPrompt, 
      enhancePrompt: true 
    });
  }
}

export const geminiImageService = new GeminiImageService();