# Children's Storybook Creator

## Overview

StoryMagic is a web application that enables users to create personalized children's storybooks using AI-powered content generation. The platform combines OpenAI's text generation capabilities with Google's Gemini image generation to produce complete storybooks with both text and illustrations. Users interact through a conversational chat interface to describe their story ideas, which are then transformed into multi-page illustrated books with options for editing, previewing, and exporting.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: Radix UI components with shadcn/ui design system for consistent, accessible interfaces
- **Styling**: Tailwind CSS with custom color system optimized for children's content (purple primary, warm orange accents)
- **State Management**: React Query for server state management and local React state for UI interactions
- **Routing**: Wouter for lightweight client-side routing
- **Typography**: Google Fonts integration (Inter for UI, Quicksand for story content, Fredoka One for headings)

The frontend follows a component-based architecture with reusable UI components organized in a shadcn/ui structure. The design system emphasizes child-friendly colors, rounded corners, and gentle shadows to create an approachable interface for parents creating stories.

### Backend Architecture
- **Framework**: Express.js with TypeScript running on Node.js
- **API Design**: RESTful endpoints for story creation, page management, and image serving
- **File Structure**: Monorepo approach with shared schema between client and server
- **Error Handling**: Centralized error middleware with structured error responses
- **Static Assets**: Custom image serving endpoint with security measures to prevent path traversal

The backend implements a service-oriented architecture with separate services for OpenAI story generation and Gemini image generation, promoting modularity and maintainability.

### Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Schema Design**: Three main entities - users, stories, and story pages with proper foreign key relationships
- **Development Storage**: In-memory storage implementation for development/testing
- **File Storage**: Temporary file system storage for generated images with plans for cloud storage integration

The database schema supports the complete story creation workflow with audit trails (created_at, updated_at) and proper cascading deletes for data integrity.

### Authentication and Authorization
- **Current State**: Basic user schema defined but authentication not yet implemented
- **Planned Implementation**: Username/password authentication with session management
- **Security**: Prepared infrastructure for user-based access control to stories and pages

### External Service Integrations
- **OpenAI Integration**: GPT-5 model for story text generation with structured prompts for age-appropriate content
- **Google Gemini**: Gemini 2.0 Flash Preview for image generation optimized for children's book illustrations
- **Image Processing**: Custom prompt enhancement for consistent children's book art style
- **Error Handling**: Robust error handling for AI service failures with fallback strategies

The system architecture prioritizes modularity, type safety, and user experience while maintaining the flexibility to scale and add new features as the platform grows.