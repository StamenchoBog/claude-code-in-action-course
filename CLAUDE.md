# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This repository contains a course project with a UIGen application - an AI-powered React component generator with live preview capabilities.

### Main Application Location
The primary application code is located in the `uigen/` directory.

## Common Development Commands

### Setup
```bash
cd uigen && npm run setup
```
This installs dependencies, generates Prisma client, and runs database migrations.

### Development
```bash
cd uigen && npm run dev
```
Starts development server with Turbopack at http://localhost:3000

### Build & Deploy
```bash
cd uigen && npm run build
cd uigen && npm run start
```

### Testing & Linting
```bash
cd uigen && npm test      # Run Vitest tests
cd uigen && npm run lint  # ESLint checks
```

### Database Operations
```bash
cd uigen && npx prisma migrate dev    # Run migrations
cd uigen && npm run db:reset          # Reset database
cd uigen && npx prisma generate       # Regenerate client
```

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 15 with App Router
- **Frontend**: React 19, TypeScript, Tailwind CSS v4
- **Database**: Prisma with SQLite (schema in `prisma/schema.prisma`)
- **AI Integration**: Anthropic Claude via Vercel AI SDK
- **Testing**: Vitest with jsdom environment
- **Code Editor**: Monaco Editor for syntax highlighting

### Key Components
- **Virtual File System**: In-memory file management (`src/lib/file-system.ts`)
- **Chat Interface**: AI conversation handling (`src/components/chat/`)
- **Code Editor**: Monaco-based editor with syntax highlighting (`src/components/editor/`)
- **Preview System**: Live component preview (`src/components/preview/`)
- **Authentication**: User management with bcrypt hashing (`src/lib/auth.ts`)

### Database Schema
- **Users**: Authentication and project ownership
- **Projects**: Component generation projects with JSON data storage
- Generated Prisma client outputs to `src/generated/prisma/`

### API Configuration
Anthropic API key is optional - stored in `.env` as `ANTHROPIC_API_KEY`. Without it, the app returns static code instead of AI-generated components.

## Important Patterns

### Path Aliases
Use `@/*` imports that resolve to `./src/*` via tsconfig paths.

### Environment Setup
The project requires Node.js 18+ and uses a custom node compatibility layer (`node-compat.cjs`) for development.

### Testing Strategy
Tests use Vitest with React Testing Library, configured for jsdom environment. Test files follow the pattern `__tests__/*.test.tsx`.
- Use comments sparingly. Only comment complex code.
- The database schema is defined in the @uigen/prisma/schema.prisma file. Reference it anytime you need to understand the structure of data stored in the database.
- vitest config is in @uigen/vitest.config.mts