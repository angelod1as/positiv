# Use Supabase as Backend Infrastructure

- Status: accepted
- Date: 2025-01-22
- Tags: architecture, backend, database, authentication

## Context

Positiv needed a backend infrastructure for a React-based event management application. The requirements included:

- PostgreSQL database for relational data (events, participants, profiles)
- User authentication with email/password
- Type-safe database access with auto-generated TypeScript types
- Real-time capabilities (future consideration)
- Cost-effective for a small team/project
- **We explicitly did not want to build and maintain our own authentication system**

## Decision

We chose Supabase as the backend-as-a-service (BaaS) platform. The primary drivers were:

1. **Excellent Developer Experience (DX)**: Local development mirrors production, CLI tooling, type generation
2. **Built-in Authentication**: Complete auth system out of the box - no custom auth to build or maintain
3. **Generous Free Tier**: Perfect for development and small projects, allowing us to start without cost pressure

Supabase provides:

- **PostgreSQL database** with full SQL capabilities
- **Supabase Auth** for authentication with SSR support
- **Row-Level Security (RLS)** for database-level authorization
- **Auto-generated TypeScript types** via Supabase CLI
- **Edge Functions** for serverless compute (if needed)

## Consequences

### Positive

- **No auth maintenance burden**: Built-in auth with email, social login, magic links
- **Outstanding DX**: `supabase start` for local dev, type generation, migrations
- Type-safe database access with auto-generated types from schema
- RLS policies enforce security at database level (defense in depth)
- PostgreSQL's powerful features available (functions, triggers, pg_cron)
- Generous free tier for development and small projects
- Active community and good documentation

### Negative

- Vendor lock-in to Supabase ecosystem
- RLS policies add complexity to database layer
- Limited control over infrastructure compared to self-hosted
- Supabase-specific patterns may not transfer to other platforms
- Must regenerate types after schema changes (`pnpm db:types`)

### Neutral

- Still using standard PostgreSQL (portable if needed)
- Can use any PostgreSQL-compatible query builder alongside Supabase client
- Authentication tokens are standard JWTs

## Alternatives Considered

1. **Firebase/Firestore**
   - Pros: Google ecosystem, real-time by default, good React integration
   - Cons: NoSQL (not ideal for relational data), vendor lock-in to Google, no SQL

2. **Self-managed PostgreSQL + Custom Auth**
   - Pros: Full control, no vendor lock-in, customizable
   - Cons: More development time, security responsibility, infrastructure management, **auth is hard to get right**

3. **Traditional Node.js + Express API**
   - Pros: Full flexibility, any database, custom everything
   - Cons: Significant development overhead, must build auth from scratch

4. **PlanetScale + Clerk**
   - Pros: MySQL-compatible, separate auth service
   - Cons: Multiple vendors, MySQL not PostgreSQL, higher complexity, additional costs

## References

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth with SSR](https://supabase.com/docs/guides/auth/server-side-rendering)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- Related: [ADR: Use Row-Level Security for Authorization](./20250124-use-rls-for-authorization.md)
