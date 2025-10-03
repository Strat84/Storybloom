import * as path from "path";
import * as fs from "fs";
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
  sessionId?: string; // Optional: to continue an existing chat session
  previousImagePath?: string; // Optional: for editing existing images
}

export interface GeneratedImage {
  imageUrl: string;
  prompt: string;
  sessionId: string; // Return session ID for future edits
}

/**
 * Manages persistent chat sessions for multi-turn image generation
 */
class ChatSessionManager {
  private sessions: Map<string, any> = new Map();
  private sessionTimeout = 30 * 60 * 1000; // 30 minutes
  private sessionTimestamps: Map<string, number> = new Map();

  /**
   * Get or create a chat session
   */
  getOrCreateSession(sessionId?: string): { session: any; id: string } {
    // Clean up old sessions first
    this.cleanupExpiredSessions();

    if (sessionId && this.sessions.has(sessionId)) {
      // Reuse existing session
      const session = this.sessions.get(sessionId)!;
      this.sessionTimestamps.set(sessionId, Date.now());
      console.log(`Reusing existing chat session: ${sessionId}`);
      return { session, id: sessionId };
    }

    // Create new session
    const newSessionId = this.generateSessionId();
    const session = ai.chats.create({
      model: "gemini-2.0-flash-preview-image-generation",
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    });

    this.sessions.set(newSessionId, session);
    this.sessionTimestamps.set(newSessionId, Date.now());
    console.log(`Created new chat session: ${newSessionId}`);
    
    return { session, id: newSessionId };
  }

  /**
   * Delete a specific session
   */
  deleteSession(sessionId: string): boolean {
    console.log(`Deleting chat session: ${sessionId}`);
    this.sessionTimestamps.delete(sessionId);
    return this.sessions.delete(sessionId);
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const expiredSessions: string[] = [];

    this.sessionTimestamps.forEach((timestamp, sessionId) => {
      if (now - timestamp > this.sessionTimeout) {
        expiredSessions.push(sessionId);
      }
    });

    expiredSessions.forEach(sessionId => {
      console.log(`Cleaning up expired session: ${sessionId}`);
      this.sessions.delete(sessionId);
      this.sessionTimestamps.delete(sessionId);
    });
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get session count (for debugging)
   */
  getActiveSessionCount(): number {
    return this.sessions.size;
  }
}

// Singleton instance
const sessionManager = new ChatSessionManager();

export class GeminiImageService {
  /**
   * Generate or edit an image with persistent chat session
   */
  async generateImage(request: ImageGenerationRequest): Promise<GeneratedImage> {
    const { prompt, enhancePrompt = true, sessionId, previousImagePath } = request;
    
    // Get or create chat session
    const { session, id } = sessionManager.getOrCreateSession(sessionId);
    
    // Enhance the prompt for better children's book style images
    const enhancedPrompt = enhancePrompt ? this.enhanceImagePrompt(prompt) : prompt;
    
    try {
    // ✅ FIX: Save to public/generated-images instead of /tmp
    const tempDir = path.join(process.cwd(), 'public', 'generated-images');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const fileName = `story-image-${Date.now()}.png`;
    const imagePath = path.join(tempDir, fileName); // Use path.join

      // Build message parts
      const messageParts: any[] = [{ text: enhancedPrompt }];

      // If editing an existing image, include it in the message
      if (previousImagePath && fs.existsSync(previousImagePath)) {
        const imageData = fs.readFileSync(previousImagePath);
        const base64Image = imageData.toString('base64');
        messageParts.push({
          inlineData: {
            mimeType: "image/png",
            data: base64Image,
          },
        });
        console.log(`Including previous image in chat: ${previousImagePath}`);
      }

      // Send message through the chat session (maintains history)
      const response = await session.sendMessage({ message: messageParts });

      const candidates = response.candidates;
      if (!candidates || candidates.length === 0) {
        throw new Error("No image generated from Gemini");
      }

      const content = candidates[0].content;
      if (!content || !content.parts) {
        throw new Error("No content parts in Gemini response");
      }

      let imageGenerated = false;
      for (const part of content.parts) {
        if (part.inlineData && part.inlineData.data) {
          const imageData = Buffer.from(part.inlineData.data, "base64");
          fs.writeFileSync(imagePath, imageData);
          imageGenerated = true;
          console.log(`Story image saved as ${imagePath}`);
          break;
        }
      }

      if (!imageGenerated) {
        throw new Error("No image data found in Gemini response");
      }

      // Return the file path and session ID
      return {
        imageUrl: `/api/images/${fileName}`,
        prompt: enhancedPrompt,
        sessionId: id, // Return session ID so client can continue the conversation
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

  /**
   * Regenerate/edit an image using chat session
   * This maintains conversation context for iterative editing
   */
  async regenerateImage(
    originalPrompt: string, 
    customInstructions?: string,
    sessionId?: string,
    previousImagePath?: string
  ): Promise<GeneratedImage> {
    let modifiedPrompt = originalPrompt;
    
    if (customInstructions) {
      // For chat-based editing, use conversational instructions
      modifiedPrompt = customInstructions;
    }

    return this.generateImage({ 
      prompt: modifiedPrompt, 
      enhancePrompt: !customInstructions, // Don't enhance if custom instructions provided
      sessionId, // Pass session ID to continue conversation
      previousImagePath, // Include previous image for editing
    });
  }

  /**
   * End a chat session (cleanup)
   */
  endChatSession(sessionId: string): boolean {
    return sessionManager.deleteSession(sessionId);
  }

  /**
   * Get active session count (for monitoring)
   */
  getActiveSessionCount(): number {
    return sessionManager.getActiveSessionCount();
  }
}

export const geminiImageService = new GeminiImageService();
