# Suggested ADRs

This document lists architectural decisions discovered in the codebase that should be documented as formal ADRs.

**To create an ADR:** Run `pnpm adr:new` and follow the interactive prompts.

---

## High Priority (Core Architecture)

### 1. Use Supabase as Backend Infrastructure
- **Decision**: PostgreSQL + Auth + RLS via Supabase
- **Alternatives**: Firebase, self-managed PostgreSQL, traditional Node backend
- **Why**: Type-safe with auto-generated types, built-in auth, RLS at database level

### 2. Use Kysely as SQL Query Builder (Not Prisma)
- **Decision**: Kysely for type-safe SQL instead of Prisma ORM
- **Alternatives**: Prisma, Knex, TypeORM, raw SQL
- **Why**: Lightweight, better SQL control, works seamlessly with Supabase

### 3. Use React Router 7 with SSR
- **Decision**: Full-stack framework with server-side rendering
- **Alternatives**: Next.js, SPA with separate backend
- **Why**: Unified frontend/backend, type-safe loaders/actions, SSR benefits

### 4. Use Row-Level Security (RLS) for Authorization
- **Decision**: PostgreSQL RLS policies on all sensitive tables
- **Alternatives**: Application-layer authorization only
- **Why**: Defense in depth, database-level enforcement, reduces app code

---

## Medium Priority (Patterns & Libraries)

### 5. Use React Hook Form + Zod for Form Validation
- **Decision**: RHF + Zod schemas + remix-forms wrapper
- **Alternatives**: Formik, React Final Form, custom forms
- **Why**: Type-safe, shared server/client validation, performance

### 6. Use Composable Functions for Error Handling
- **Decision**: `composable-functions` library for business logic
- **Alternatives**: try-catch blocks, custom error classes
- **Why**: Functional error propagation, type-safe results, composability

### 7. Use Server-Only File Suffixes (.server.ts)
- **Decision**: Enforce `.server.ts` suffix for server-only code
- **Alternatives**: Directory separation, runtime checks
- **Why**: Build-time enforcement, prevents client bundle leaks

### 8. Use AG Grid for Admin Data Tables
- **Decision**: AG Grid Community Edition for admin tables
- **Alternatives**: TanStack Table (used elsewhere), custom tables
- **Why**: Rich features, professional UI, custom editors support

---

## Lower Priority (Supporting Decisions)

### 9. Use Nodemailer with AWS SES for Email
- **Decision**: Nodemailer + SES in production, Mailhog locally
- **Alternatives**: SendGrid, Mailgun, other SMTP
- **Why**: Cost-effective, same API for dev/prod

### 10. Use Listmonk for Newsletter Management
- **Decision**: Self-hosted Listmonk for email marketing
- **Alternatives**: Mailchimp, ConvertKit
- **Why**: Open-source, API-first, cost-effective

### 11. Use Atomic Design for Component Organization
- **Decision**: atoms/molecules/organisms/pages structure
- **Alternatives**: Feature-based, flat structure
- **Why**: Clear hierarchy, reusability, scalability

### 12. Use Tailwind CSS v4 for Styling
- **Decision**: Tailwind v4 with Vite plugin
- **Alternatives**: CSS-in-JS, CSS modules, SASS
- **Why**: Latest features, Vite integration, ShadcN compatibility

### 13. Use Cloudflare Turnstile for CAPTCHA
- **Decision**: Turnstile instead of reCAPTCHA
- **Alternatives**: Google reCAPTCHA, hCaptcha
- **Why**: Privacy-friendly, modern bot detection

---

## Testing Strategy (Could be Single ADR)

### 14. Testing Architecture
- **Unit tests**: Vitest with jsdom environment
- **Integration tests**: Vitest with Node environment + real database
- **E2E tests**: Playwright against production build
- **TDD mandated**: Red-Green-Refactor cycles required

---

## Already Documented

- [x] Git Worktree Workflow (ADR-0001)
- [x] Use Log4brains (ADR-20250630)
- [x] Use Markdown ADRs (ADR-20250630)

---

## How to Prioritize

1. **Start with core infrastructure** (Supabase, Kysely, React Router) - these affect everything
2. **Document security decisions** (RLS) - important for compliance/audits
3. **Document patterns** (forms, error handling) - helps new developers
4. **Document tooling choices** - prevents "why not X?" questions

---

*Delete this file after creating the ADRs, or keep it as a backlog tracker.*
