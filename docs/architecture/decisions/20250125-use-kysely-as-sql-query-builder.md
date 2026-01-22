# Use Kysely as SQL Query Builder

- Status: accepted
- Date: 2025-01-25
- Tags: database, architecture, typescript

## Context

With Supabase as our backend, we needed a way to write type-safe database queries. While Supabase provides a JavaScript client, we wanted more control over SQL generation and better TypeScript integration for complex queries involving joins, aggregations, and transactions.

## Decision

We chose Kysely as our SQL query builder, accessed through a single entry point at `~/lib/supabase/db.server`. Kysely works alongside the Supabase JavaScript client - Kysely for complex queries, Supabase client for auth and simple operations.

```typescript
// All database access through single entry point
import { db } from '~/lib/supabase/db.server'

// Type-safe queries
const events = await db
  .selectFrom('events')
  .where('is_active', '=', true)
  .selectAll()
  .execute()
```

## Consequences

### Positive

- Full SQL control with type safety
- Lightweight with minimal overhead (vs Prisma)
- Works seamlessly with Supabase's PostgreSQL
- No schema file needed - types generated from database
- Better performance characteristics than ORMs
- Composable queries with full TypeScript inference
- Single entry point (`db.server`) makes refactoring easy

### Negative

- Less abstraction than Prisma (more SQL knowledge required)
- No automatic migrations (handled by Supabase migrations)
- Smaller community than Prisma
- Must manually handle relationships (no automatic eager loading)
- Types must be regenerated after schema changes

### Neutral

- Can still use Supabase client for simple operations
- Same database connection as Supabase
- Compatible with existing RLS policies

## Alternatives Considered

1. **Prisma ORM**
   - Pros: Large community, automatic migrations, great DX, relation handling
   - Cons: Heavy runtime, opinionated schema file, less SQL control, slower queries

2. **Supabase JavaScript Client Only**
   - Pros: Built-in, simple API, real-time support
   - Cons: Limited for complex queries, awkward joins, less type safety

3. **Knex.js**
   - Pros: Mature, well-documented, SQL-focused
   - Cons: Weaker TypeScript support, older patterns

4. **Raw SQL with pg**
   - Pros: Maximum control, no abstraction
   - Cons: No type safety, error-prone, verbose

5. **Drizzle ORM**
   - Pros: Modern, type-safe, SQL-like syntax
   - Cons: Newer/less stable, would require migration from Kysely

## References

- [Kysely Documentation](https://kysely.dev/)
- [kysely-supabase adapter](https://github.com/AnotherUserName/kysely-supabase)
- Related: [ADR: Use Supabase as Backend Infrastructure](./20250122-use-supabase-as-backend-infrastructure.md)
