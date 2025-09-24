import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { openAIStoryService } from "./services/openaiService";
import { geminiImageService } from "./services/geminiService";
import { pdfService } from "./services/pdfService";
import { 
  createStoryRequestSchema, 
  updatePageRequestSchema, 
  generateImageRequestSchema 
} from "@shared/schema";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";

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
    let storyId: string | undefined;
    try {
      const request = createStoryRequestSchema.parse(req.body);
      
      // Create initial story record
      const story = await storage.createStory({
        title: request.title || "Untitled Story",
        status: "generating",
        totalPages: request.totalPages,
        description: request.prompt
      });
      storyId = story.id;

      // Generate story content with OpenAI
      const generatedStory = await openAIStoryService.generateStory({
        prompt: request.prompt,
        totalPages: request.totalPages
      });

      // Update story title from AI generation
      const updatedStory = await storage.updateStory(story.id, {
        title: generatedStory.title,
        status: "complete"
      });

      // Create story pages
      const pages = [];
      for (const generatedPage of generatedStory.pages) {
        const page = await storage.createStoryPage({
          storyId: story.id,
          pageNumber: generatedPage.pageNumber,
          text: generatedPage.text,
          imagePrompt: generatedPage.imagePrompt
        });
        pages.push(page);
      }

      res.json({
        story: updatedStory,
        pages: pages
      });

    } catch (error) {
      console.error('Create story error:', error);
      
      // If OpenAI generation fails, mark story as failed instead of leaving it in generating state
      if (storyId) {
        try {
          await storage.updateStory(storyId, { status: "error" });
        } catch (updateError) {
          console.error('Failed to update story status to error:', updateError);
        }
      }
      
      // Return proper status codes for validation errors
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
      const updates = updatePageRequestSchema.parse(req.body);
      
      // SECURITY: Verify that the page belongs to the specified story
      const existingPage = await storage.getStoryPage(req.params.pageId);
      if (!existingPage) {
        return res.status(404).json({ error: 'Page not found' });
      }
      
      if (existingPage.storyId !== req.params.storyId) {
        return res.status(403).json({ error: 'Page does not belong to this story' });
      }
      
      const updatedPage = await storage.updateStoryPage(req.params.pageId, updates);
      if (!updatedPage) {
        return res.status(404).json({ error: 'Page not found' });
      }

      res.json(updatedPage);

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

      // Generate image using the page's image prompt
      const generatedImage = await geminiImageService.generateImage({
        prompt: page.imagePrompt,
        enhancePrompt: true
      });

      // Update the page with the generated image URL
      const updatedPage = await storage.updateStoryPage(page.id, {
        imageUrl: generatedImage.imageUrl
      });

      res.json({
        page: updatedPage,
        imageUrl: generatedImage.imageUrl
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

  return httpServer;
}
