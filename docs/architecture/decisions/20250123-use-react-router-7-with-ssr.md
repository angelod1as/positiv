# Use React Router 7 with Server-Side Rendering

- Status: accepted
- Date: 2025-01-23
- Tags: architecture, frontend, framework

## Context

Positiv needed a full-stack React framework that could handle:

- Server-side rendering for SEO and performance
- Type-safe data loading
- Form handling with server actions
- File-based routing
- Good developer experience

The project was originally built with Remix, which has since merged with React Router v7.

## Decision

We use React Router 7 as our full-stack framework with server-side rendering enabled (`ssr: true` in config). This provides:

- **Loaders** for type-safe data fetching on the server
- **Actions** for form submissions and mutations
- **File-based routing** in `/app/pages/`
- **Type generation** via `react-router typegen`
- **SSR** with hydration for optimal performance

```typescript
// react-router.config.ts
export default {
  ssr: true,
  // ...
}
```

## Consequences

### Positive

- Unified framework for frontend and backend code
- Server-side rendering improves SEO and initial load performance
- Type-safe loaders and actions with generated route types
- Native streaming support for async data
- Smooth migration path from Remix
- Active development and React team involvement
- Good integration with Supabase SSR patterns

### Negative

- Learning curve for loader/action patterns
- SSR adds complexity compared to pure SPA
- Must be careful about server-only code leaking to client
- Newer framework (v7) with evolving patterns
- Some Remix-era documentation may be outdated

### Neutral

- Similar patterns to Next.js (loaders ≈ getServerSideProps)
- Can still use client-side navigation when appropriate
- Compatible with most React libraries

## Alternatives Considered

1. **Next.js**
   - Pros: Larger community, more mature, Vercel support
   - Cons: Different routing paradigm, App Router complexity, migration cost

2. **Remix (pre-merger)**
   - Pros: We were already using it
   - Cons: Merged into React Router 7, no longer separate

3. **TanStack Start**
   - Pros: Modern, type-safe, from TanStack ecosystem (Query, Table, etc.)
   - Cons: Newer/less mature, smaller community, would require migration

4. **SPA with Vite + React**
   - Pros: Simpler, no SSR complexity
   - Cons: Poor SEO, slower initial load, separate API needed

5. **Astro with React Islands**
   - Pros: Great performance, partial hydration
   - Cons: Different mental model, less suited for app-like UX

## References

- [React Router Documentation](https://reactrouter.com/)
- [React Router v7 Migration Guide](https://reactrouter.com/upgrading/v6)
- [TanStack Start](https://tanstack.com/start/latest)
- [Supabase SSR with React Router](https://supabase.com/docs/guides/auth/server-side-rendering)
