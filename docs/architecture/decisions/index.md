# Architecture Decision Records

This directory contains the Architecture Decision Records (ADRs) for the Positiv project.

## What is an ADR?

An Architecture Decision Record (ADR) captures a single architectural decision, including the context, the decision made, and its consequences.

ADRs are immutable once accepted - only their status can change (deprecated or superseded). This ensures the full history of decisions is preserved.

## Current ADRs

| ID | Title | Status |
|----|-------|--------|
| [0001](./0001-git-worktree-workflow.md) | Git Worktree Workflow | Accepted |
| [20250630](./20250630-use-markdown-architectural-decision-records.md) | Use Markdown ADRs | Accepted |

## Creating a New ADR

1. Copy `template.md` with the format `YYYYMMDD-title-in-kebab-case.md`
2. Fill in the context, decision, and consequences
3. Submit as a PR for review
4. Update this index after acceptance

## More Information

- [ADR GitHub organization](https://adr.github.io/)
- [Michael Nygard's article on ADRs](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions.html)
