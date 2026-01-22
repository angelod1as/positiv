# Use Log4brains to Manage ADRs

- Status: accepted
- Date: 2025-06-29
- Tags: dev-tools, documentation

## Context

We want to record architectural decisions made in this project and need tooling to manage these records effectively. The tool should support creating, browsing, and publishing ADRs.

## Decision

We use [Log4brains](https://github.com/thomvaill/log4brains) as our ADR management tool. It provides:

- Command-line interface for creating ADRs
- Static site generator for browsing decisions
- Hot-reload preview during editing
- Support for tags and cross-references

```bash
pnpm adr:new      # Create new ADR
pnpm adr:preview  # Preview ADRs in browser
```

## Consequences

### Positive

- Single tool for creation, management, and publishing
- Interactive prompts guide ADR creation
- Static site makes decisions easily browsable
- Supports superseding and linking between ADRs

### Negative

- Additional dev dependency
- Requires learning Log4brains conventions

### Neutral

- Can still edit markdown files directly
- Works with any CI/CD for deployment

## Alternatives Considered

1. **ADR Tools** (adr-tools)
   - Pros: Simple, shell-based
   - Cons: No static site generation, basic features

2. **ADR Tools Python**
   - Pros: Python ecosystem
   - Cons: Limited features, no web UI

3. **adr-viewer**
   - Pros: Static site generator
   - Cons: No creation tools, view-only

4. **Manual markdown management**
   - Pros: No dependencies
   - Cons: No tooling support, manual indexing

## References

- [Log4brains GitHub](https://github.com/thomvaill/log4brains)
- [Log4brains Documentation](https://github.com/thomvaill/log4brains#readme)
- Related: [Use Markdown Architectural Decision Records](./20250630-use-markdown-architectural-decision-records.md)
