# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

```bash
# Development
pnpm dev          # Start development server (port 5173)

# Build & Production
pnpm build        # Build for production
pnpm start        # Start production server

# Code Quality - ALWAYS run before committing
pnpm lint         # Runs ESLint, generates types, and checks TypeScript

# Testing
pnpm test         # Run Playwright E2E tests
pnpm test:ui      # Run tests with UI

# Database Types Generation
pnpm db:types --local  # Generate TypeScript types from local Supabase instance
pnpm db:types          # For production Supabase (rarely used)

# Email Testing
pnpm email:test   # Start Mailhog for local email testing
```

## High-Level Architecture

### Tech Stack
- **Frontend**: React 19 + React Router 7 + TypeScript
- **Backend**: Supabase (PostgreSQL + Auth)
- **Styling**: Tailwind CSS v4
- **Forms**: React Hook Form + Zod validation
- **Database Queries**: Kysely (type-safe SQL query builder)
- **Email**: Nodemailer (AWS SES) + React Email templates

### Project Structure
```
/app
  /business     - Core business logic modules
    /admin      - Admin-specific logic and pages
    /auth       - Authentication flows
    /participant - Participant-facing logic
  /components   - React components (atomic design)
    /atoms      - Basic building blocks
    /forms      - Form components
    /molecules  - Composite components
    /organisms  - Complex components
    /ui         - ShadcN UI components
  /lib          - Utilities and integrations
    /email      - Email sending and templates
    /helpers    - General utilities
    /supabase   - Database client and types
  /pages        - Application pages (follows route structure)
  /types        - TypeScript type definitions
```

### Key Architectural Patterns

1. **Database Access**: All database queries use Kysely through the `~/lib/supabase/db.server` module. Types are auto-generated from Supabase schema.

2. **Authentication**: Supabase Auth with SSR support. Auth state is managed through React Router's session handling.

3. **Form Handling**: Consistent pattern using React Hook Form + Zod schemas. Forms are in `/app/components/forms`.

4. **Email System**: 
   - Templates in `/app/lib/email/templates`
   - Sending logic in `/app/lib/email/send.server.ts`
   - Local testing with Mailhog

5. **Type Safety**: Strict TypeScript with database types generated from schema. Path aliases use `~/*` for `/app/*`.

6. **Protected Routes**: Admin routes require authentication and admin role verification through loaders.

### Development Guidelines

1. **Before Committing**: Always run `pnpm lint` to ensure code quality and type safety.

2. **Database Changes**: After schema changes, regenerate types with `pnpm db:types --local`.

3. **Component Organization**: Follow atomic design principles. New UI components should extend ShadcN UI when possible.

4. **Server-Only Code**: Use `.server.ts` suffix for server-only modules to prevent client-side imports.

5. **Environment Variables**: Required variables are documented in `.env.example`. Local development requires Supabase setup.

6. **Testing**: Write E2E tests for new features in `/e2e` directory.

### Common Tasks

**Adding a new page**:
1. Create route file in `/app/pages` following existing structure
2. Implement loader for data fetching
3. Add authentication checks if needed
4. Use existing UI components from `/app/components`

**Working with database**:
1. Use Kysely query builder from `~/lib/supabase/db.server`
2. Regenerate types after schema changes
3. Follow existing patterns in `/app/business` modules

**Creating forms**:
1. Define Zod schema for validation
2. Use form components from `/app/components/forms`
3. Handle submission in action functions
4. Show errors using existing error handling patterns