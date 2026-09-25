# Positiv Documentation

Welcome to the Positiv project documentation. This directory contains all technical documentation, guides, and architectural decisions for the project.

## Table of Contents

### 🏗️ Architecture Decision Records (ADRs)

We use [Log4brains](https://github.com/thomvaill/log4brains) to manage ADRs. Browse them with:

```bash
pnpm adr:preview  # Opens browser with ADR knowledge base
```

Current ADRs:

- [ADR-0001: Git Worktree Workflow](./architecture/decisions/0001-git-worktree-workflow.md) - Using git worktrees for parallel development
- [ADR: Use Log4brains](./architecture/decisions/20250630-use-log4brains-to-manage-the-adrs.md) - ADR management tool
- [ADR: Use Markdown ADRs](./architecture/decisions/20250630-use-markdown-architectural-decision-records.md) - Decision to use MADR format
- [ADR: A payment can be zero](./architecture/decisions/20260901-a-payment-can-be-zero.md) - Why a settled participation may carry no money
- [ADR: Host the Sanity Studio as its own workspace package](./architecture/decisions/20260924-host-the-sanity-studio-as-its-own-workspace-package.md) - Why the Studio is not embedded in the app
- [ADR: Sanity schema changes follow expand/contract](./architecture/decisions/20260924-sanity-schema-changes-follow-expand-contract.md) - How to rename or remove a Sanity field safely
- [ADR: No repository fallback for Public Site content](./architecture/decisions/20260924-no-repository-fallback-for-public-site-content.md) - Why Sanity is the only copy of Public Site content

To create a new ADR: `pnpm adr:new`

### 🔧 Development

- [CLAUDE.md](../CLAUDE.md) - Claude Code configuration and guidelines

### 📁 Temporary Plans

- [plans/](./plans/) - Temporary implementation plans for Linear tasks (deleted after PR creation)

## About This Documentation

This documentation follows these principles:

1. **Living Documentation** - Updated as the project evolves
2. **Decision Records** - Important architectural decisions are documented with context
3. **Practical Guides** - Step-by-step instructions for common workflows
4. **Searchable** - Clear titles and structure for easy navigation

## Contributing to Documentation

When adding new documentation:

1. **ADRs** - Use `pnpm adr:new` to create interactively
2. Update this README with links to new documents
3. Keep language clear and concise
4. Include examples where helpful

## Quick Links

- [Project README](../README.md)
- [Environment Setup](../.env.schema)
