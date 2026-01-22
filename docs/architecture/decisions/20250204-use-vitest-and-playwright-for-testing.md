# Use Vitest and Playwright for Testing

- Status: accepted
- Date: 2025-02-04
- Tags: testing, quality, tooling

## Context

Positiv requires comprehensive testing to ensure:

- Business logic correctness
- UI component behavior
- Integration between frontend and backend
- End-to-end user flows

We needed a testing strategy that:

- Supports TDD workflow
- Provides fast feedback during development
- Covers unit, integration, and E2E layers
- Works well with React and TypeScript

## Decision

We use a three-layer testing approach:

### Unit Tests (Vitest + React Testing Library)

- Fast, isolated tests for components and utilities
- jsdom environment for component testing
- Co-located with source files (`*.test.ts`)

### Integration Tests (Vitest + Real Database)

- Test business logic with actual Supabase instance
- Node environment with database access
- Separate config (`vitest.integration.config.ts`)

### E2E Tests (Playwright)

- Test complete user journeys against production build
- Multiple browser support
- Organized by authentication state

```bash
pnpm test           # All tests (unit + integration)
pnpm test:unit      # Unit tests only
pnpm test:integration # Integration tests only
pnpm test:e2e       # Playwright E2E tests
```

### TDD Workflow (Mandatory)

1. **Red**: Write failing test first
2. **Green**: Minimal code to pass
3. **Refactor**: Improve while keeping tests green

## Consequences

### Positive

- Fast unit tests enable TDD workflow
- Integration tests catch database/API issues
- E2E tests verify real user flows
- Vitest is fast with native ESM support
- Playwright is reliable and cross-browser
- Good TypeScript support throughout

### Negative

- Three testing tools to maintain
- Integration tests require database setup
- E2E tests are slower (production build)
- Must balance test coverage vs. speed
- Learning curve for Playwright patterns

### Neutral

- Tests are required before merging (CI enforced)
- Coverage reports available but not enforced
- Can run tests in watch mode during development

## Test Organization

```
/app
  /components/Button.tsx
  /components/Button.test.tsx      # Unit test
  /business/auth.server.ts
  /business/auth.integration.test.ts # Integration test
/e2e
  /tests
    /authenticated                  # E2E tests requiring login
    /unauthenticated               # E2E tests without login
```

## Alternatives Considered

1. **Jest instead of Vitest**
   - Pros: More mature, larger ecosystem
   - Cons: Slower, ESM configuration issues

2. **Cypress instead of Playwright**
   - Pros: Good DX, time-travel debugging
   - Cons: Slower, single-tab limitation

3. **Testing Library only (no E2E)**
   - Pros: Simpler, faster
   - Cons: Misses integration issues

4. **Single test framework for everything**
   - Pros: Simpler setup
   - Cons: No tool does all layers well

## References

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- Project test setup: `vitest.config.ts`, `playwright.config.ts`
