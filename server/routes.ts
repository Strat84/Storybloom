import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { openAIStoryService, persistGeneratedStory } from "./services/openaiService";
import { geminiImageService, GENERATED_IMAGES_DIR } from "./services/geminiService";
import { pdfService } from "./services/pdfService";
import {
  createStoryRequestSchema,
  generateImageRequestSchema,
} from "@shared/schema";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { uploadStoryImage } from "./services/s3/s3Service.js";
import {
  evaluateGenerationLimit,
  GenerationLimitError,
} from "./services/generationLimits";
import {
  getStoryPageItem,
  updatePageImageMetadata,
  editStory,
} from "./services/dynamodb/story/index.js";
import dotenv from "dotenv";
import { extractUserIdFromToken } from "./utils/extractUserIdFromToken.js";

dotenv.config();

export async function registerRoutes(app: Express): Promise<Server> {
  // Static file serving for generated images
  app.get('/api/images/:filename', (req, res) => {
    const filename = req.params.filename;
    
    // SECURITY: Prevent path traversal attacks by sanitizing filename
    const sanitizedFilename = path.basename(filename);
    if (sanitizedFilename !== filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    
    const imagePath = path.join('/tmp/generated-images', sanitizedFilename);
    
    if (fs.existsSync(imagePath)) {
      res.sendFile(imagePath);
    } else {
      res.status(404).json({ error: 'Image not found' });
    }
  });

  // Create a new story with AI generation
  app.post('/api/stories', async (req, res) => {
    try {
      const request = createStoryRequestSchema.parse(req.body);

      let userId: string;
      try {
        userId = extractUserIdFromToken(req.headers.authorization);
      } catch (tokenError) {
        console.error('Token extraction error:', tokenError);
        return res.status(401).json({ error: tokenError instanceof Error ? tokenError.message : 'Invalid token' });
      }

      const { v4: uuidv4 } = await import('uuid');
      const storyId = uuidv4();

      const generatedStory = await openAIStoryService.generateStory({
        prompt: request.prompt,
        totalPages: request.totalPages
      });

      const story = await storage.createStory({
        id: storyId,
        title: generatedStory.title,
        status: "complete",
        totalPages: request.totalPages,
        description: request.prompt
      });

      const pages = [];
      const pageIdsMapping = [];
      
      for (const generatedPage of generatedStory.pages) {
        const page = await storage.createStoryPage({
          storyId: storyId,
          pageNumber: generatedPage.pageNumber,
          text: generatedPage.text,
          imagePrompt: generatedPage.imagePrompt
        });
        pages.push(page);
        
        pageIdsMapping.push({
          pageNumber: generatedPage.pageNumber,
          pageId: page.id
        });
      }

        await persistGeneratedStory(
        generatedStory,
        userId,
        {
          storyId: storyId,
          authorizationHeader: req.headers.authorization,
          pageIdsMapping,
        }
      );      res.json({
        story,
        pages,
        storyId
      });

    } catch (error) {
      console.error('Create story error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid request data',
          details: error.errors
        });
      }
      
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to create story' 
      });
    }
  });

  // Get a story with its pages
  app.get('/api/stories/:id', async (req, res) => {
    try {
      const story = await storage.getStory(req.params.id);
      if (!story) {
        return res.status(404).json({ error: 'Story not found' });
      }

      const pages = await storage.getStoryPages(story.id);
      
      res.json({
        story,
        pages
      });

    } catch (error) {
      console.error('Get story error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to get story' 
      });
    }
  });

  // Get all stories
  app.get('/api/stories', async (req, res) => {
    try {
      const stories = await storage.getAllStories();
      res.json(stories);
    } catch (error) {
      console.error('Get stories error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to get stories' 
      });
    }
  });

  // Update a story page
  app.patch('/api/stories/:storyId/pages/:pageId', async (req, res) => {
    try {
      const { text, imagePrompt } = req.body;
      const storyId = req.params.storyId;
      const pageId = req.params.pageId;

      let userId: string;
      try {
        userId = extractUserIdFromToken(req.headers.authorization);
      } catch (tokenError) {
        console.error('Token extraction error:', tokenError);
        return res.status(401).json({ error: tokenError instanceof Error ? tokenError.message : 'Invalid token' });
      }

      // Get page details from DynamoDB using pageId
      let pageNumber: number;
      try {
        // Find the page by pageId to get its pageNumber
        const { getStoryPageByPageId } = await import('./services/dynamodb/story/index.js');
        const pageData = await getStoryPageByPageId(storyId, pageId);
        
        if (!pageData) {
          return res.status(404).json({ error: 'Page not found' });
        }
        
        pageNumber = pageData.pageNo; // Get actual pageNumber from DB
      } catch (findError) {
        console.error('Failed to find page:', findError);
        return res.status(404).json({ error: 'Page not found' });
      }
      // Update page text and imagePrompt in DynamoDB if provided
      if (text !== undefined || imagePrompt !== undefined) {
        const pageUpdates = [];
        const updateData: any = { pageNumber };
        
        if (text !== undefined) updateData.text = text;
        if (imagePrompt !== undefined) updateData.imagePrompt = imagePrompt;
        
        pageUpdates.push(updateData);

        await editStory({
          storyId,
          userId,
          pages: pageUpdates
        });
      }

      res.json({
        message: 'Page updated successfully',
        storyId,
        pageId,
        pageNumber,
        updatedFields: {
          ...(text !== undefined && { text }),
          ...(imagePrompt !== undefined && { imagePrompt })
        }
      });

    } catch (error) {
      console.error('Update page error:', error);
      
      // Return proper status codes for validation errors
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid request data',
          details: error.errors
        });
      }
      
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to update page' 
      });
    }
  });

  // Generate image for a story page
  app.post('/api/stories/:storyId/pages/:pageId/generate-image', async (req, res) => {
    try {
      const page = await storage.getStoryPage(req.params.pageId);
      if (!page) {
        return res.status(404).json({ error: 'Page not found' });
      }

      // SECURITY: Verify that the page belongs to the specified story
      if (page.storyId !== req.params.storyId) {
        return res.status(403).json({ error: 'Page does not belong to this story' });
      }

      const pageNumber = page.pageNumber;

      console.log(`Table Name: ${process.env.STORIES_TABLE}`);
      let generationPlan;
      try {
        if (!process.env.STORIES_TABLE) {
          throw new Error("STORIES_TABLE environment variable is not set");
        }
        const dynamoMetadata = await getStoryPageItem(page.storyId, pageNumber);
        console.log('DynamoDB metadata for page:', dynamoMetadata);

        const fallbackMetadata = dynamoMetadata ?? (page as unknown as Record<string, unknown>);

        generationPlan = evaluateGenerationLimit(fallbackMetadata);
        console.log('Image generation plan:', generationPlan);
      } catch (limitError) {
        if (limitError instanceof GenerationLimitError) {
          return res.status(limitError.statusCode).json({ error: limitError.message });
        }
        console.error('Failed to evaluate generation limits:', limitError);
        return res.status(500).json({ error: 'Unable to validate image generation limits' });
      }

      const generatedImage = await geminiImageService.generateImage({
        prompt: page.imagePrompt,
        enhancePrompt: true
      });
      console.log('Generated image:', generatedImage);

      let imageUrlToPersist = generatedImage.imageUrl;
      let uploadedKey: string | undefined;
      console.log('Bucket Name:', process.env.STORY_ASSETS_BUCKET);

      if (process.env.STORY_ASSETS_BUCKET) {
        try {
          let extension = 'png';
          if (generatedImage.contentType) {
            if (generatedImage.contentType === 'image/jpeg') extension = 'jpg';
            else if (generatedImage.contentType === 'image/webp') extension = 'webp';
            else if (generatedImage.contentType === 'image/png') extension = 'png';
          }
          const fileName = `${page.storyId}_${pageNumber}.${extension}`;
          const uploadResult = await uploadStoryImage({
            storyId: page.storyId,
            pageNumber,
            buffer: generatedImage.imageBuffer,
            contentType: generatedImage.contentType,
            fileName,
          });
          console.log('Uploaded generated image to S3:', uploadResult);

          imageUrlToPersist = uploadResult.signedUrl;
          uploadedKey = uploadResult.key;
        } catch (uploadError) {
          console.error('Failed to upload generated image to S3:', uploadError);
          return res.status(500).json({ error: 'Unable to store generated image' });
        }
      }
      console.log(`Table Name: ${process.env.STORIES_TABLE}, Uploaded Key: ${uploadedKey}`);

      if (process.env.STORIES_TABLE && uploadedKey) {
        try {
          await updatePageImageMetadata({
            storyId: page.storyId,
            pageNumber,
            imageUrl: imageUrlToPersist,
            imageKey: uploadedKey,
            imageGenerationCount: generationPlan.nextCount,
            imageGenerationDate: generationPlan.generationDate,
            lastImageGeneratedAt: generationPlan.lastGeneratedAtIso,
          });
        } catch (dynamoUpdateError) {
          console.error('Failed to update DynamoDB metadata for story page image:', dynamoUpdateError);
        }
      }

      const updatedPage = await storage.updateStoryPage(
        page.id,
        {
          imageUrl: imageUrlToPersist,
          imageGenerationCount: generationPlan.nextCount,
          imageGenerationDate: generationPlan.generationDate,
          lastImageGeneratedAt: generationPlan.lastGeneratedAtIso,
        } as any,
      );
      console.log('Updated page with new image URL:', updatedPage);

      res.json({
        page: updatedPage,
        imageUrl: imageUrlToPersist,
        imageGenerationCount: generationPlan.nextCount,
        lastGeneratedAt: generationPlan.lastGeneratedAtIso,
      });

    } catch (error) {
      console.error('Generate image error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to generate image' 
      });
    }
  });

  // Route to generate all images for a story at once for consistency
  app.post('/api/stories/:storyId/generate-all-images', async (req, res) => {
    try {
      const story = await storage.getStory(req.params.storyId);
      if (!story) {
        return res.status(404).json({ error: 'Story not found' });
      }

      const pages = await storage.getStoryPages(req.params.storyId);
      if (!pages || pages.length === 0) {
        return res.status(404).json({ error: 'No pages found for story' });
      }

      // Get character description from request body
      const { characterDescription } = req.body;
      
      // Create a comprehensive character consistency prefix
      let consistencyPrefix = `Children's book illustration style. Story: "${story.title}". `;
      
      if (characterDescription && characterDescription.trim()) {
        consistencyPrefix += `MAIN CHARACTER (must appear exactly the same in all images): ${characterDescription.trim()}. `;
      }
      
      consistencyPrefix += `Art style: Colorful, warm, child-friendly illustrations with soft edges and vibrant colors. Maintain exact character appearance, clothing, and features across all scenes. `;
      
      // Generate all images with the unified character description
      const updatedPages = [];
      for (const page of pages) {
        if (page.imagePrompt) {
          try {
            // Combine the consistency prefix with the specific scene description
            const enhancedPrompt = consistencyPrefix + `Scene: ${page.imagePrompt}`;
            
            console.log(`Generating image for page ${page.pageNumber} with enhanced prompt:`, enhancedPrompt.substring(0, 200) + '...');
            
            const generatedImage = await geminiImageService.generateImage({
              prompt: enhancedPrompt,
              enhancePrompt: false // Don't double-enhance since we're doing it manually
            });

            const updatedPage = await storage.updateStoryPage(page.id, {
              imageUrl: generatedImage.imageUrl
            });

            updatedPages.push(updatedPage);
          } catch (pageError) {
            console.error(`Failed to generate image for page ${page.pageNumber}:`, pageError);
            // Continue with other pages even if one fails
            updatedPages.push(page);
          }
        } else {
          updatedPages.push(page);
        }
      }

      res.json({
        story: story,
        pages: updatedPages,
        message: `Generated images for ${updatedPages.filter(p => p?.imageUrl).length} pages with consistent character design`
      });

    } catch (error) {
      console.error('Batch generate images error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to generate images' 
      });
    }
  });

  // Regenerate image with custom prompt
  app.post('/api/generate-image', async (req, res) => {
    try {
      const request = generateImageRequestSchema.parse(req.body);
      
      const generatedImage = await geminiImageService.generateImage({
        prompt: request.prompt,
        enhancePrompt: true
      });

      res.json(generatedImage);

    } catch (error) {
      console.error('Generate custom image error:', error);
      
      // Return proper status codes for validation errors
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid request data',
          details: error.errors
        });
      }
      
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to generate image' 
      });
    }
  });

  // Delete a story
  app.delete('/api/stories/:id', async (req, res) => {
    try {
      const deleted = await storage.deleteStory(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Story not found' });
      }

      res.json({ success: true });

    } catch (error) {
      console.error('Delete story error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to delete story' 
      });
    }
  });

  // Export story as PDF
  app.get('/api/stories/:id/export/pdf', async (req, res) => {
    try {
      const story = await storage.getStory(req.params.id);
      if (!story) {
        return res.status(404).json({ error: 'Story not found' });
      }

      const pages = await storage.getStoryPages(story.id);
      
      // Generate PDF
      const pdfBuffer = await pdfService.generateStoryPDF(story, pages);
      
      // Set appropriate headers for PDF download
      const filename = `${story.title.replace(/[^a-zA-Z0-9]/g, '_')}_storybook.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      res.send(pdfBuffer);

    } catch (error) {
      console.error('Export PDF error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to export story as PDF' 
      });
    }
  });

  const httpServer = createServer(app);
