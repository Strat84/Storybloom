import OpenAI from "openai";
import dotenv from "dotenv";
import fetch from "node-fetch";
import { createStory as createStoryRecord } from "server/services/dynamodb/story";
import { PersistStoryOptions } from "server/types/persistStoryOptions";

dotenv.config();

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface StoryGenerationRequest {
  prompt: string;
  totalPages: number;
  targetAge?: string;
}

export interface GeneratedPage {
  pageNumber: number;
  text: string;
  imagePrompt: string;
}

export interface GeneratedStory {
  title: string;
  pages: GeneratedPage[];
  targetAge: string;
}

export class OpenAIStoryService {
  async generateStory(request: StoryGenerationRequest): Promise<GeneratedStory> {
    const { prompt, totalPages, targetAge = "4-8 years old" } = request;
    
    const systemPrompt = `You are a master children's book author specializing in creating engaging, educational, and age-appropriate stories for children ${targetAge}.

Your task is to create a complete children's storybook with exactly ${totalPages} pages based on the user's prompt.

Guidelines:
- Write for children aged ${targetAge} with appropriate vocabulary and concepts
- Each page should have 1-3 sentences that are easy to read
- Include positive messages, problem-solving, friendship, or learning themes
- Make the story engaging with clear character development
- End with a satisfying conclusion that reinforces the story's message
- For each page, provide both story text and a detailed image description

Respond in JSON format with this exact structure:
{
  "title": "A creative, engaging title",
  "targetAge": "${targetAge}",
  "pages": [
    {
      "pageNumber": 1,
      "text": "The story text for this page",
      "imagePrompt": "Detailed description for illustration: characters, setting, mood, art style (colorful children's book illustration style), specific visual elements"
    }
  ]
}

Make sure each imagePrompt is detailed and specific, mentioning:
- Characters and their appearance/clothing
- Setting and background details  
- Mood and atmosphere
- Art style (always specify "colorful children's book illustration style")
- Specific visual elements that match the text`;

    const userPrompt = `Create a ${totalPages}-page children's storybook about: ${prompt}

Make it magical, engaging, and perfect for children aged ${targetAge}.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },

      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No content received from OpenAI");
      }

      const generatedStory = JSON.parse(content) as GeneratedStory;
      
      // Validate the response structure
      if (!generatedStory.title || !generatedStory.pages || generatedStory.pages.length !== totalPages) {
        throw new Error("Invalid story structure received from OpenAI");
      }

      // Ensure pages are properly numbered
      generatedStory.pages = generatedStory.pages.map((page, index) => ({
        ...page,
        pageNumber: index + 1
      }));

      return generatedStory;

    } catch (error) {
      console.error("OpenAI story generation error:", error);
      throw new Error(`Failed to generate story: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async regeneratePage(originalStory: GeneratedStory, pageNumber: number, customPrompt?: string): Promise<GeneratedPage> {
    const systemPrompt = `You are helping to regenerate a single page of an existing children's story.
    
Story context:
- Title: "${originalStory.title}"
- Target age: ${originalStory.targetAge}
- Total pages: ${originalStory.pages.length}

Generate a replacement for page ${pageNumber} that fits naturally with the overall story flow.

${customPrompt ? `Special instructions: ${customPrompt}` : ''}

Respond in JSON format:
{
  "pageNumber": ${pageNumber},
  "text": "The new story text for this page",
  "imagePrompt": "Detailed description for illustration matching the children's book style"
}`;

    const contextPages = originalStory.pages
      .filter(p => p.pageNumber !== pageNumber)
      .map(p => `Page ${p.pageNumber}: ${p.text}`)
      .join('\n');

    const userPrompt = `Here's the story context:
${contextPages}

Please generate a new version of page ${pageNumber} that fits naturally with this story.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },

      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No content received from OpenAI");
      }

      const generatedPage = JSON.parse(content) as GeneratedPage;
      generatedPage.pageNumber = pageNumber; // Ensure correct page number

      return generatedPage;

    } catch (error) {
      console.error("OpenAI page regeneration error:", error);
      throw new Error(`Failed to regenerate page: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const openAIStoryService = new OpenAIStoryService();

const AWS_STORY_ENDPOINT = process.env.CREATE_STORY_ENDPOINT;

export async function persistGeneratedStory(
  generatedStory: GeneratedStory,
  userId: string,
  options?: PersistStoryOptions
): Promise<{ storyId: string }> {
  const resolvedUserId = userId || options?.userId;
  
  if (!resolvedUserId) {
    throw new Error('User ID is required for story creation');
  }
  
  let storyId = options?.storyId;
  if (!storyId) {
    const { v4: uuidv4 } = await import('uuid');
    storyId = uuidv4();
  }
  
  const pagesWithIds = generatedStory.pages.map((page) => {
    const pageMapping = options?.pageIdsMapping?.find(p => p.pageNumber === page.pageNumber);
    return {
      text: page.text,
      imageDescription: page.imagePrompt,
      pageId: pageMapping?.pageId
    };
  });
  
  const payload = {
    userId: resolvedUserId,
    title: generatedStory.title,
    pages: pagesWithIds,
    storyId,
  };

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  let response;
  try {
    if (!AWS_STORY_ENDPOINT) {
      throw new Error("CREATE_STORY_ENDPOINT environment variable is not set.");
    }
    
    response = await fetch(AWS_STORY_ENDPOINT, {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      return (await response.json()) as { storyId: string };
    }

    const status = response.status;
    const errorText = await response.text();
    console.warn(`AWS endpoint responded with ${status}: ${errorText}`);

    if (status !== 401 && status !== 403) {
      throw new Error(`Failed to save story to AWS: ${status} - ${errorText}`);
    }
  } catch (err) {
    console.warn("Primary AWS endpoint failed, trying fallback:", err);
  }

  const hasAwsCredentials = Boolean(
    process.env.AWS_ACCESS_KEY_ID && 
    process.env.AWS_SECRET_ACCESS_KEY && 
    process.env.STORIES_TABLE
  );

  if (hasAwsCredentials) {
    try {
      console.log("Attempting DynamoDB direct save...");
      const savedStoryId = await createStoryRecord(
        resolvedUserId, 
        generatedStory.title, 
        payload.pages, 
        storyId
      );
      return { storyId: savedStoryId };
    } catch (fallbackError) {
      console.error("DynamoDB fallback save failed:", fallbackError);
    }
  }

  console.warn(`Returning fallback storyId ${storyId}; data may be persisted locally only.`);
  return { storyId };
}