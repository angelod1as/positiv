# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working with Git Worktrees

**IMPORTANT**: Always use git worktrees for feature development to avoid conflicts and maintain clean workspace separation.

### Creating a New Feature Worktree

```bash
# Create a new worktree for your feature
wt add feature/your-feature-name feature-name

# Switch to the new worktree
cd ../positiv-worktrees/feature-name

# Install dependencies
pnpm install
```

### Worktree Commands

- `wt add <branch> [name]` - Create new worktree
- `wt list` or `wtl` - List all worktrees
- `wt remove <name>` or `wtr <name>` - Remove worktree
- `wt <name>` - Switch to worktree

### Best Practices

1. Create a new worktree for each feature/bug fix
2. Name worktrees descriptively but concisely
3. Always run `pnpm install` after creating a worktree
4. Remove worktrees after merging PRs with `wtr <name>`
5. When `wtr <name>` is used, `git pull` from the main `positiv/` folder

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

6. Do not add comments to the code unless it's a particularly complex method

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

### Testing

- ⁠Do your best to test the exposed API, its inputs and outputs rather than implementation details.
- ⁠TDD is non-negotiable. Always write the tests first, and make sure they are failing before implementing the fix. Move in baby steps throug the red-green-refactor cycles.

## Definition of Done

- ⁠A task is not done if the linter is not passing for the whole project
- ⁠A task is not done if the tests are not green for the whole project
- ⁠A task is not done if it has new behavior without tests to ensure the new behavior

## Commit Guidelines

### Conventional Commit Style

•⁠  ⁠Always run related tests before committing changes.
•⁠  ⁠Follow [Conventional Commits](https://www.conventionalcommits.org/) specification
•⁠  ⁠Commit message structure: ⁠ <type>(optional scope): <description> ⁠
•⁠  ⁠Types include:

- ⁠ feat ⁠: New feature
- ⁠ fix ⁠: Bug fix
- ⁠ docs ⁠: Documentation changes
- ⁠ style ⁠: Code formatting, no logic change
- ⁠ refactor ⁠: Code restructuring without changing behavior
- ⁠ test ⁠: Adding or modifying tests
- ⁠ chore ⁠: Maintenance tasks, dependency updates
•⁠  ⁠Examples:
- ⁠ feat(auth): add user registration flow ⁠
- ⁠ fix(payments): resolve stripe webhook parsing error ⁠
- ⁠ docs: update README with new setup instructions ⁠
- ⁠ refactor(services): simplify user creation service ⁠
•⁠  ⁠Use imperative mood for descriptions (e.g., "Add feature" not "Added feature")
•⁠  ⁠Include breaking changes with ⁠ BREAKING CHANGE: ⁠ in footer when applicable

## GitHub Workflow

- ⁠Whenever the user has it, use the GitHub CLI to create pull requests
- ⁠PR titles should not use the Conventional Commit Style. Instead, they should add the Linear ticket(s) to the start of the title, like in "[POS-923, POS-924] Add rake tasks for failed searches import and book brief generation". If no Linear ticket exists, use "[NO-TICKET]" prefix.
- The Linear tasks should also be in the description using keywords like "Solve POS-123" or "Fixes POS-123". For PRs without Linear tickets, use "Fixes NO-TICKET"
- ⁠Follow PR description style from @.github/pull_request_template.md
- ⁠Always create PRs as draft when possible
