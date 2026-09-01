# Architecture Decision Records

This directory contains the Architecture Decision Records (ADRs) for the Positiv project.

## What is an ADR?

An Architecture Decision Record (ADR) captures a single architectural decision, including the context, the decision made, and its consequences.

ADRs are immutable once accepted - only their status can change (deprecated or superseded). This ensures the full history of decisions is preserved.

## Current ADRs

### Process & Tooling

| Date | Title | Status |
|------|-------|--------|
| [0001](./0001-git-worktree-workflow.md) | Git Worktree Workflow | Accepted |
| [2025-06-30](./20250630-use-log4brains-to-manage-the-adrs.md) | Use Log4brains | Accepted |
| [2025-06-30](./20250630-use-markdown-architectural-decision-records.md) | Use Markdown ADRs | Accepted |

### Core Architecture

| Date | Title | Status |
|------|-------|--------|
| [2025-01-22](./20250122-use-supabase-as-backend-infrastructure.md) | Use Supabase as Backend Infrastructure | Accepted |
| [2025-01-23](./20250123-use-react-router-7-with-ssr.md) | Use React Router 7 with SSR | Accepted |
| [2025-01-24](./20250124-use-rls-for-authorization.md) | Use Row-Level Security for Authorization | Accepted |
| [2025-01-25](./20250125-use-kysely-as-sql-query-builder.md) | Use Kysely as SQL Query Builder | Accepted |
| [2025-01-26](./20250126-use-server-only-file-suffixes.md) | Use Server-Only File Suffixes (.server.ts) | Accepted |

### Frontend & UI

| Date | Title | Status |
|------|-------|--------|
| [2025-01-27](./20250127-use-tailwind-css-v4.md) | Use Tailwind CSS v4 | Accepted |
| [2025-01-28](./20250128-use-atomic-design-for-components.md) | Use Atomic Design for Components | Accepted |

### Patterns & Libraries

| Date | Title | Status |
|------|-------|--------|
| [2025-01-29](./20250129-use-react-hook-form-and-remix-forms-with-zod.md) | Use React Hook Form + Remix Forms with Zod | Superseded |
| [2025-01-30](./20250130-use-composable-functions-for-error-handling.md) | Use Composable Functions for Error Handling | Accepted |
| [2025-02-02](./20250202-use-ag-grid-for-admin-tables.md) | Use AG Grid for Admin Tables | Accepted |

### Infrastructure & Services

| Date | Title | Status |
|------|-------|--------|
| [2025-01-31](./20250131-use-nodemailer-with-aws-ses.md) | Use Nodemailer with AWS SES | Accepted |
| [2025-02-01](./20250201-use-listmonk-for-newsletters.md) | Use Listmonk for Newsletters | Accepted |
| [2025-02-03](./20250203-use-cloudflare-turnstile.md) | Use Cloudflare Turnstile for CAPTCHA | Accepted |

### Payments

| Date | Title | Status |
|------|-------|--------|
| [2026-09-01](./20260901-a-payment-can-be-zero.md) | A payment can be zero | Accepted |

### Testing

| Date | Title | Status |
|------|-------|--------|
| [2025-02-04](./20250204-use-vitest-and-playwright-for-testing.md) | Use Vitest + Playwright for Testing | Accepted |

## Using Log4brains

We use [Log4brains](https://github.com/thomvaill/log4brains) to manage and browse ADRs.

```bash
# Preview ADRs in browser (with hot reload)
pnpm adr:preview

# Create a new ADR interactively
pnpm adr:new

# Build static site for deployment
pnpm adr:build
```

## More Information

- [Log4brains documentation](https://github.com/thomvaill/log4brains)
- [ADR GitHub organization](https://adr.github.io/)
- [Michael Nygard's article on ADRs](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions.html)
