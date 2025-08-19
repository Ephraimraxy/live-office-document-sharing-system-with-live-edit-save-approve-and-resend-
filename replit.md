# Overview

This is a comprehensive document workflow management web application built as a full-stack solution. The system enables organizations to create, review, approve, and manage documents through structured workflows with role-based access control. The application supports file uploads, commenting, versioning, audit logging, and notification systems for collaborative document processing.

# User Preferences

Preferred communication style: Simple, everyday language.

# Recent Changes

## Office Management System Implementation (August 19, 2025)
- Added office entities to the database schema with office ID, name, description, and admin assignment
- Implemented full CRUD operations for office management through REST API endpoints
- Created office management UI for admins to create, edit, and delete offices
- Built office dashboard page where users can view office-specific information and statistics
- Added navigation links for admin office management in the sidebar
- Integrated office assignment functionality allowing admins to assign users to specific offices
- Enhanced user schema to include office assignment field

## Migration to Replit Environment (August 19, 2025)
- Successfully migrated document workflow management application from Replit Agent to Replit environment
- Implemented MemStorage class for development mode to replace PostgreSQL dependency
- Configured session management with memory store for development
- All dependencies installed and project running successfully on port 5000
- Application uses client/server separation with React frontend and Express backend
- Authentication system configured but will need setup for production use

# System Architecture

## Frontend Architecture
- **React** with TypeScript for the user interface
- **Vite** as the build tool and development server
- **Tailwind CSS** for styling with **shadcn/ui** component library providing pre-built UI components
- **TanStack Query** for server state management and API caching
- **React Hook Form** with **Zod** validation for form handling
- **Wouter** for client-side routing

## Backend Architecture
- **Node.js** with **Express** framework for the REST API server
- **TypeScript** throughout the entire stack for type safety
- **Drizzle ORM** for database operations with PostgreSQL
- **Multer** for handling file uploads with configurable file type restrictions
- **Session-based authentication** using PostgreSQL session storage

## Database Design
- **PostgreSQL** as the primary database with **Neon** as the serverless provider (using MemStorage for development)
- **Drizzle** schema definitions in TypeScript with migrations support
- Core entities include:
  - Users with role-based permissions (ADMIN, OFFICER, REVIEWER, APPROVER, VIEWER) and office assignment
  - Offices with unique office IDs, names, descriptions, and member management
  - Documents with status tracking and metadata
  - Document versions for revision history
  - Comments for collaboration
  - Workflows and tasks for process management
  - Departments for organizational structure
  - Audit logs for compliance tracking
  - Notifications for real-time updates

## Authentication & Authorization
- **Replit Auth** integration using OpenID Connect (OIDC)
- **Passport.js** strategy for authentication middleware
- **Role-based access control** with multiple permission levels
- **Session management** with PostgreSQL-backed session store using connect-pg-simple

## File Management
- **Local file system** storage with multer for development
- Support for PDF, DOC, DOCX, and TXT file types with 10MB size limits
- Configurable file upload validation and processing

## State Management Pattern
- **Server state** managed by TanStack Query with automatic caching and synchronization
- **Client state** handled by React's built-in state management
- **Form state** managed by React Hook Form with Zod schema validation

## Development & Build Process
- **ESBuild** for production server bundling
- **Vite** for frontend development and building
- **TypeScript** compilation with strict type checking
- **Hot module replacement** in development mode
- **Environment-based configuration** for development vs production

## API Design
- **RESTful API** structure with Express routes
- **Middleware pattern** for authentication, logging, and error handling
- **Type-safe API** contracts using shared TypeScript interfaces
- **File upload endpoints** with proper validation and error handling
- **Query parameter support** for filtering, pagination, and search