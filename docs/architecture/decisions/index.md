# Architecture Decision Records

This directory contains the Architecture Decision Records (ADRs) for the Positiv project.

## What is an ADR?

An Architecture Decision Record (ADR) captures a single architectural decision, including the context, the decision made, and its consequences.

ADRs are immutable once accepted - only their status can change (deprecated or superseded). This ensures the full history of decisions is preserved.

## Current ADRs

| ID | Title | Status |
|----|-------|--------|
| [0001](./0001-git-worktree-workflow.md) | Git Worktree Workflow | Accepted |
| [20250630](./20250630-use-log4brains-to-manage-the-adrs.md) | Use Log4brains | Accepted |
| [20250630](./20250630-use-markdown-architectural-decision-records.md) | Use Markdown ADRs | Accepted |

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
