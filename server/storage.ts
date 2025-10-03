import { 
  type User, 
  type InsertUser, 
  type Story, 
  type InsertStory, 
  type StoryPage, 
  type InsertStoryPage 
} from "@shared/schema";
import { randomUUID } from "crypto";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Story methods
  createStory(story: InsertStory & { id?: string }): Promise<Story>;
  getStory(id: string): Promise<Story | undefined>;
  updateStory(id: string, updates: Partial<Story>): Promise<Story | undefined>;
  deleteStory(id: string): Promise<boolean>;
  getAllStories(): Promise<Story[]>;
  
  // Story page methods
  createStoryPage(page: InsertStoryPage): Promise<StoryPage>;
  getStoryPage(id: string): Promise<StoryPage | undefined>;
  getStoryPages(storyId: string): Promise<StoryPage[]>;
  updateStoryPage(id: string, updates: Partial<StoryPage>): Promise<StoryPage | undefined>;
  deleteStoryPage(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private stories: Map<string, Story>;
  private storyPages: Map<string, StoryPage>;

  constructor() {
    this.users = new Map();
    this.stories = new Map();
    this.storyPages = new Map();
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Story methods
  async createStory(insertStory: InsertStory & { id?: string }): Promise<Story> {
  // Always use the provided id if present, do not generate a new one
  const id = insertStory.id ? insertStory.id : randomUUID();
    const now = new Date();
    const story: Story = { 
      ...insertStory,
      status: insertStory.status || "draft",
      author: insertStory.author || "You & AI",
      totalPages: insertStory.totalPages || 4,
      description: insertStory.description || null,
      id, 
      createdAt: now, 
      updatedAt: now 
    };
    this.stories.set(id, story);
    return story;
  }

  async getStory(id: string): Promise<Story | undefined> {
    return this.stories.get(id);
  }

  async updateStory(id: string, updates: Partial<Story>): Promise<Story | undefined> {
    const story = this.stories.get(id);
    if (!story) return undefined;
    
    const updatedStory: Story = { 
      ...story, 
      ...updates, 
      updatedAt: new Date() 
    };
    this.stories.set(id, updatedStory);
    return updatedStory;
  }

  async deleteStory(id: string): Promise<boolean> {
    // Also delete all related pages
    const pages = Array.from(this.storyPages.values()).filter(page => page.storyId === id);
    pages.forEach(page => this.storyPages.delete(page.id));
    
    return this.stories.delete(id);
  }

  async getAllStories(): Promise<Story[]> {
    return Array.from(this.stories.values());
  }

  // Story page methods
  async createStoryPage(insertPage: InsertStoryPage): Promise<StoryPage> {
    const id = randomUUID();
    const now = new Date();
    const page: StoryPage = { 
      ...insertPage,
      imageUrl: insertPage.imageUrl || null,
      id, 
      createdAt: now, 
      updatedAt: now 
    };
    this.storyPages.set(id, page);
    return page;
  }

  async getStoryPage(id: string): Promise<StoryPage | undefined> {
    return this.storyPages.get(id);
  }

  async getStoryPages(storyId: string): Promise<StoryPage[]> {
    return Array.from(this.storyPages.values())
      .filter(page => page.storyId === storyId)
      .sort((a, b) => a.pageNumber - b.pageNumber);
  }

  async updateStoryPage(id: string, updates: Partial<StoryPage>): Promise<StoryPage | undefined> {
    const page = this.storyPages.get(id);
    if (!page) return undefined;
    
    const updatedPage: StoryPage = { 
      ...page, 
      ...updates, 
      updatedAt: new Date() 
    };
    this.storyPages.set(id, updatedPage);
    return updatedPage;
  }

  async deleteStoryPage(id: string): Promise<boolean> {
    return this.storyPages.delete(id);
  }
}

export const storage = new MemStorage();
