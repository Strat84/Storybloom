import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Stories table
export const stories = pgTable(
  "stories",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    title: text("title").notNull(),
    author: text("author").notNull().default("You & AI"),
    description: text("description"),
    status: text("status").notNull().default("draft"), // draft, generating, complete, error
    totalPages: integer("total_pages").notNull().default(10),
    isPublic: boolean("is_public").default(false),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    generationStatus: text("generation_status", { enum: ["PENDING", "COMPLETED", "FAILED"] }).default("PENDING"),
  },
  (table) => {
    return {
      ...table,
      // Triggers
      // @ts-ignore
      insert: table.insert.trigger("set_default_values"),
      // @ts-ignore
      update: table.update.trigger("set_updated_at"),
    };
  }
);

// Story pages table
export const storyPages = pgTable("story_pages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storyId: varchar("story_id").notNull().references(() => stories.id, { onDelete: "cascade" }),
  pageNumber: integer("page_number").notNull(),
  text: text("text").notNull(),
  imagePrompt: text("image_prompt").notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const editStoryRequestSchema = z.object({
  title: z.string().optional(),
  pages: z.array(z.object({
    pageNumber: z.number().positive(),
    text: z.string().optional(),
    imagePrompt: z.string().optional(),
    shouldRegenerateImage: z.boolean().optional(),
  })).optional(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertStorySchema = createInsertSchema(stories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStoryPageSchema = createInsertSchema(storyPages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Select types
export type User = typeof users.$inferSelect;
export type Story = typeof stories.$inferSelect;
export type StoryPage = typeof storyPages.$inferSelect;

// Insert types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertStory = z.infer<typeof insertStorySchema>;
export type InsertStoryPage = z.infer<typeof insertStoryPageSchema>;

// API Request schemas
export const createStoryRequestSchema = z.object({
  prompt: z.string().min(10, "Story prompt must be at least 10 characters"),
  title: z.string().optional(),
  totalPages: z.number().refine((val) => [10, 15, 20].includes(val), {
    message: "Total pages must be 10, 15, or 20"
  }).default(10),
});

export const updatePageRequestSchema = z.object({
  text: z.string().optional(),
  imagePrompt: z.string().optional(),
  shouldRegenerateImage: z.boolean().optional(),
});

export const generateImageRequestSchema = z.object({
  prompt: z.string().min(5, "Image prompt must be at least 5 characters"),
});

export type CreateStoryRequest = z.infer<typeof createStoryRequestSchema>;
export type UpdatePageRequest = z.infer<typeof updatePageRequestSchema>;
export type GenerateImageRequest = z.infer<typeof generateImageRequestSchema>;
export type EditStoryRequest = z.infer<typeof editStoryRequestSchema>;
