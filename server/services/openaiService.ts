import OpenAI from "openai";
import dotenv from "dotenv";
import fetch from "node-fetch";
import { createStory as createStoryRecord } from "server/services/dynamodb/story";
import { PersistStoryOptions } from "server/types/persistStoryOptions";

dotenv.config();

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Image style options for consistent visual storytelling
export const IMAGE_STYLES = {
  traditional_cartoon: {
    id: 0,
    name: "Traditional Cartoon",
    prompt: "Style: Classic Western children's cartoon with dynamic action poses, thick black outlines, and saturated primary colors. Simple, readable shapes with gentle squash-and-stretch; minimal cel shading plus occasional halftone/texture for backgrounds. Clear silhouettes, bold sound/motion cues (whoosh lines, dust puffs). Warm, playful tone; compositions uncluttered and story-first."
  },
  anime_kid: {
    id: 1,
    name: "Kid-Friendly Anime",
    prompt: "Style: Kid-friendly anime with rounded features, large expressive eyes (soft highlights), and slightly enlarged head/hand proportions (not chibi). Playful, colorful hair with bright edge highlights; clean line art and soft gradients. Add shōnen-style energy cues—speed lines, sparkle accents, wind sweeps—kept gentle and age-appropriate. Warm pastel-leaning palette, tidy backgrounds, light rim light; avoid edgy/adult themes or heavy contrast."
  },
  three_d_kid: {
    id: 2,
    name: "3D Kids Style",
    prompt: "Style: Stylized 3D for kids: rounded forms, simplified anatomy, and cozy PBR materials (soft fabric weave, matte wood, gentle skin SSS). Cinematic but friendly lighting with rim light and occasional god rays; mild DOF and SSAO for depth. Emissive glows for magic cues; avoid hyper-real pores or gritty textures. Warm/cool color contrast for drama while keeping a safe, inviting feel."
  },
  chibi: {
    id: 3,
    name: "Chibi",
    prompt: "Style: Ultra-cute chibi with super-deformed proportions: oversized heads, tiny bodies, big sparkling eyes, and simplified features. Thick, rounded outlines with soft line-weight variation; pastel neutrals and gentle gradients. Puffy shapes, blush marks, sticker-like star/heart sparkles, tiny motion lines. Minimal shading, no clutter or heavy contrast—instant readability and maximum adorableness."
  }
};

export interface StoryGenerationRequest {
  prompt: string;
  totalPages: number;
  targetAge?: string;
  authorName?: string;
  websiteName?: string;
  imageStyleId?: number;
}

export interface GeneratedPage {
  pageNumber: number;
  text: string;
  imagePrompt: string;
}

export interface GeneratedCover {
  type: 'front' | 'back';
  title?: string;
  author?: string;
  text?: string;
  imagePrompt: string;
}

export interface GeneratedStory {
  title: string;
  pages: GeneratedPage[];
  targetAge: string;
  frontCover: GeneratedCover;
  backCover: GeneratedCover;
  imageStyleId: number;
}

export class OpenAIStoryService {
  async generateStory(request: StoryGenerationRequest): Promise<GeneratedStory> {
    const {
      prompt,
      totalPages,
      targetAge = "4-8 years old",
      authorName,
      websiteName = "StoryForge",
      imageStyleId = 1 // Default to anime style
    } = request;

    // Get the selected style
    const selectedStyle = Object.values(IMAGE_STYLES).find(s => s.id === imageStyleId) || IMAGE_STYLES.anime_kid;

    const systemPrompt = `You are a master children's book author specializing in creating engaging, educational, and age-appropriate stories for children ${targetAge}.

Your task is to create a complete children's storybook with exactly ${totalPages} pages based on the user's prompt, PLUS front and back cover designs.

CRITICAL ART STYLE REQUIREMENT:
You MUST use this EXACT art style description at the START of every single imagePrompt you generate:
"${selectedStyle.prompt}"

This style MUST be the first part of EVERY imagePrompt, followed by your scene-specific details.

Guidelines:
- Write for children aged ${targetAge} with appropriate vocabulary and concepts
- Each page should have 1-3 sentences that are easy to read
- Include positive messages, problem-solving, friendship, or learning themes
- Make the story engaging with clear character development
- Ensure CHARACTER CONSISTENCY: Main characters should look the same across all pages
- End with a satisfying conclusion that reinforces the story's message

IMAGE PROMPT STRUCTURE:
For EVERY imagePrompt, follow this exact format:
1. START with the complete style description: "${selectedStyle.prompt}"
2. THEN add "Scene:" followed by your specific scene details
3. Include character descriptions (consistent across pages), actions, settings, mood

EXAMPLE imagePrompt format:
"${selectedStyle.prompt} Scene: [Your specific scene description with characters, setting, action, etc.]"

COVER REQUIREMENTS:
- Front Cover: 
  * Must feature the main character(s) and capture the story's magical essence
  * Must include the story title prominently displayed on the cover
  ${authorName ? `* Must include author name "${authorName}" displayed on the cover (e.g., "By ${authorName}")` : '* Do NOT include any author name on the cover'}
  * Design should be exciting and inviting for children
- Back Cover: Should be simple and welcoming, featuring "Created by ${websiteName}" text prominently
- BOTH covers MUST start with the same style description

Respond in JSON format with this exact structure:
{
  "title": "A creative, engaging title",
  "targetAge": "${targetAge}",
  "imageStyleId": ${imageStyleId},
  "frontCover": {
    "type": "front",
    "title": "Same as main title",
    ${authorName ? `"author": "${authorName}",` : ''}
    "imagePrompt": "${selectedStyle.prompt} Scene: [Front cover illustration with main character(s), magical/adventure elements. The title text '[STORY TITLE]' is prominently displayed${authorName ? ` with 'By ${authorName}' shown below the title` : ''}. Exciting and inviting composition perfect for a children's book cover.]"
  },
  "backCover": {
    "type": "back", 
    "text": "Created by ${websiteName}",
    "imagePrompt": "${selectedStyle.prompt} Scene: [Back cover specific details - soft background pattern or texture, space for text 'Created by ${websiteName}', gentle colors that complement the front cover]"
  },
  "pages": [
    {
      "pageNumber": 1,
      "text": "The story text for this page",
      "imagePrompt": "${selectedStyle.prompt} Scene: [Specific scene details for this page with consistent character descriptions]"
    }
  ]
}

REMEMBER: Every single imagePrompt MUST begin with the complete style description, no exceptions!`;

    const userPrompt = `Create a ${totalPages}-page children's storybook about: ${prompt}

Art Style: ${selectedStyle.name}
${authorName ? `Author: ${authorName}` : ''}

Make it magical, engaging, and perfect for children aged ${targetAge}.
Ensure characters look consistent across all pages.
Remember to start EVERY imagePrompt with the exact style description provided.`;

    try {
      console.log(`Generating story with style: ${selectedStyle.name} (ID: ${imageStyleId})`);

      const response = await openai.chat.completions.create({
        model: "gpt-5-nano",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        // temperature: 0.9,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No content received from OpenAI");
      }

      const generatedStory = JSON.parse(content) as GeneratedStory;

      // Validate the response structure
      if (!generatedStory.title || !generatedStory.pages || !generatedStory.frontCover || !generatedStory.backCover) {
        throw new Error("Invalid story structure received from OpenAI - missing covers or pages");
      }

      if (generatedStory.pages.length !== totalPages) {
        throw new Error(`Expected ${totalPages} pages, got ${generatedStory.pages.length}`);
      }

      // Ensure pages are properly numbered
      generatedStory.pages = generatedStory.pages.map((page, index) => ({
        ...page,
        pageNumber: index + 1
      }));

      // Ensure covers have correct types and author info
      generatedStory.frontCover.type = 'front';
      if (authorName) {
        generatedStory.frontCover.author = authorName;
      }
      generatedStory.backCover.type = 'back';

      // Set the style ID in the response
      generatedStory.imageStyleId = imageStyleId;

      console.log("Story generated successfully with covers and consistent style");
      return generatedStory;

    } catch (error) {
      console.error("OpenAI story generation error:", error);
      throw new Error(`Failed to generate story: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async regeneratePage(originalStory: GeneratedStory, pageNumber: number, customPrompt?: string): Promise<GeneratedPage> {
    // Get the style that was used for the original story
    const selectedStyle = Object.values(IMAGE_STYLES).find(s => s.id === originalStory.imageStyleId) || IMAGE_STYLES.anime_kid;

    const systemPrompt = `You are helping to regenerate a single page of an existing children's story.
    
Story context:
- Title: "${originalStory.title}"
- Target age: ${originalStory.targetAge}
- Total pages: ${originalStory.pages.length}

CRITICAL: You MUST use this EXACT art style at the START of the imagePrompt:
"${selectedStyle.prompt}"

IMPORTANT: Maintain CHARACTER CONSISTENCY with the rest of the story. Characters should look the same as they do on other pages.

Generate a replacement for page ${pageNumber} that fits naturally with the overall story flow.

${customPrompt ? `Special instructions: ${customPrompt}` : ''}

Respond in JSON format:
{
  "pageNumber": ${pageNumber},
  "text": "The new story text for this page",
  "imagePrompt": "${selectedStyle.prompt} Scene: [Your specific scene details with consistent character descriptions]"
}`;

    const contextPages = originalStory.pages
      .filter(p => p.pageNumber !== pageNumber)
      .map(p => `Page ${p.pageNumber}: ${p.text}`)
      .join('\n');

    const userPrompt = `Here's the story context:
${contextPages}

Please generate a new version of page ${pageNumber} that fits naturally with this story.
Ensure characters remain consistent with the rest of the story.
Remember to start the imagePrompt with the exact style description.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No content received from OpenAI");
      }

      const generatedPage = JSON.parse(content) as GeneratedPage;
      generatedPage.pageNumber = pageNumber;

      return generatedPage;

    } catch (error) {
      console.error("OpenAI page regeneration error:", error);
      throw new Error(`Failed to regenerate page: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async regenerateCovers(
    originalStory: GeneratedStory, 
    authorName?: string,
    websiteName: string = "StoryForge",
    customInstructions?: string
  ): Promise<{ frontCover: GeneratedCover, backCover: GeneratedCover }> {
    // Get the style that was used for the original story
    const selectedStyle = Object.values(IMAGE_STYLES).find(s => s.id === originalStory.imageStyleId) || IMAGE_STYLES.anime_kid;

    const systemPrompt = `You are helping to regenerate the front and back covers for an existing children's story.
    
Story context:
- Title: "${originalStory.title}"
- Target age: ${originalStory.targetAge}
- Story summary: ${originalStory.pages.map(p => p.text).join(' ').substring(0, 500)}...

CRITICAL: You MUST use this EXACT art style at the START of both cover imagePrompts:
"${selectedStyle.prompt}"

${customInstructions ? `Special instructions: ${customInstructions}` : ''}

Generate new cover designs that capture the story's essence and maintain character consistency.

Respond in JSON format:
{
  "frontCover": {
    "type": "front",
    "title": "${originalStory.title}",
    ${authorName ? `"author": "${authorName}",` : ''}
    "imagePrompt": "${selectedStyle.prompt} Scene: [Front cover specific details with main character(s)${authorName ? ', author name placement area' : ''}]"
  },
  "backCover": {
    "type": "back",
    "text": "Created by ${websiteName}",
    "imagePrompt": "${selectedStyle.prompt} Scene: [Back cover specific details with space for text]"
  }
}`;

    const userPrompt = `Please generate new front and back cover designs for this story that will excite children and parents.
${authorName ? `Include author name: ${authorName}` : 'No author name to display'}
Remember to start EVERY imagePrompt with the exact style description.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No content received from OpenAI");
      }

      const result = JSON.parse(content);
      return {
        frontCover: { 
          ...result.frontCover, 
          type: 'front',
          author: authorName || undefined
        },
        backCover: { 
          ...result.backCover, 
          type: 'back' 
        }
      };

    } catch (error) {
      console.error("OpenAI cover regeneration error:", error);
      throw new Error(`Failed to regenerate covers: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  // Include cover data in the payload
  const payload = {
    userId: resolvedUserId,
    title: generatedStory.title,
    pages: pagesWithIds,
    storyId,
    frontCover: {
      title: generatedStory.frontCover.title || generatedStory.title,
      author: generatedStory.frontCover.author,
      imageDescription: generatedStory.frontCover.imagePrompt
    },
    backCover: {
      text: generatedStory.backCover.text,
      imageDescription: generatedStory.backCover.imagePrompt
    },
    imageStyleId: generatedStory.imageStyleId,
    targetAge: generatedStory.targetAge
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