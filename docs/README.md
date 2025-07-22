# Positiv Documentation

Welcome to the Positiv project documentation. This directory contains all technical documentation, guides, and architectural decisions for the project.

## Table of Contents

### 📚 Guides
- [Git Worktree Guide](./guides/worktree-guide.md) - How to use git worktrees for parallel development with Claude

### 🏗️ Architecture Decision Records (ADRs)
- [ADR-0001: Git Worktree Workflow](./decisions/0001-git-worktree-workflow.md) - Using git worktrees for parallel development
- [ADR Template](./decisions/template.md) - Template for new ADRs

### 🔧 Development
- [CLAUDE.md](../CLAUDE.md) - Claude Code configuration and guidelines

## About This Documentation

This documentation follows these principles:

1. **Living Documentation** - Updated as the project evolves
2. **Decision Records** - Important architectural decisions are documented with context
3. **Practical Guides** - Step-by-step instructions for common workflows
4. **Searchable** - Clear titles and structure for easy navigation

## Contributing to Documentation

When adding new documentation:

1. **Guides** go in `/docs/guides/`
2. **ADRs** go in `/docs/decisions/` with the next number
3. Update this README with links to new documents
4. Keep language clear and concise
5. Include examples where helpful

## Quick Links

- [Project README](../README.md)
- [Environment Setup](../.env.example)
- [Database Schema](../supabase/schema.sql)