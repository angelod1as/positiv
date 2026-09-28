# Positiv Documentation

Welcome to the Positiv project documentation. This directory contains all technical documentation, guides, and architectural decisions for the project.

## Table of Contents

### 🏗️ Architecture Decision Records (ADRs)

We use [Log4brains](https://github.com/thomvaill/log4brains) to manage ADRs. Browse them with:

```bash
pnpm adr:preview  # Opens browser with ADR knowledge base
```

The full list, grouped by area and with each record's status, lives in
[`architecture/decisions/index.md`](./architecture/decisions/index.md) — the single
source of truth. Add every new ADR there, not here.

To create a new ADR: `pnpm adr:new`

### 📖 Domain Glossary

- [CONTEXT.md](../CONTEXT.md) - The project's vocabulary: Public Site vs Platform, Editor, Page, Section, Person, Testimonial

### 🔧 Development

- [CLAUDE.md](../CLAUDE.md) - Claude Code configuration and guidelines

### 💳 Operations

- [Payments runbook](./payments-runbook.md) - Asaas webhook queue, inbox, email outbox, refunds, and trying the flow in dev

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

1. **ADRs** - Use `pnpm adr:new` to create interactively, then list it in `architecture/decisions/index.md`
2. Update this README with links to new documents that are not ADRs
3. Keep language clear and concise
4. Include examples where helpful

## Quick Links

- [Project README](../README.md)
- [Environment Setup](../.env.schema)
