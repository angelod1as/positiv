# Use Row-Level Security (RLS) for Authorization

- Status: accepted
- Date: 2025-01-24
- Tags: security, database, authorization

## Context

Positiv handles sensitive user data (profiles, event participation, personal information). We needed an authorization strategy that:

- Prevents unauthorized data access even if application code has bugs
- Reduces authorization logic in application code
- Works with Supabase's authentication system
- Scales without performance degradation

**Note:** RLS is strongly recommended and promoted by Supabase as the standard approach for authorization. Their documentation, tutorials, and tooling are all built around RLS-first patterns, making it the natural choice when using Supabase.

## Decision

We implement PostgreSQL Row-Level Security (RLS) policies on all sensitive tables. Authorization is enforced at the database level, with policies that check:

- User authentication status (`auth.uid()`)
- User roles (admin vs regular user)
- Data ownership (user can only see their own data)

```sql
-- Example: Users can only read their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
USING (is_admin(auth.uid()));
```

## Consequences

### Positive

- Defense in depth: security at database layer, not just application
- Impossible to accidentally expose data through application bugs
- Reduces authorization boilerplate in application code
- Works automatically with direct database access (Supabase client, Kysely)
- Centralized security logic in migrations
- Auditable security rules in version control
- First-class support in Supabase ecosystem

### Negative

- Adds complexity to database layer
- Policies must be carefully designed to avoid performance issues
- Debugging authorization issues requires understanding RLS
- Must use `SECURITY DEFINER` functions for privileged operations
- Can't easily test policies without database access

### Neutral

- Application can still add additional authorization checks if needed
- RLS is standard PostgreSQL, portable to other PostgreSQL hosts
- No impact on application code structure

## Alternatives Considered

1. **Application-Layer Authorization Only**
   - Pros: Simpler database, easier to debug
   - Cons: Single point of failure, bugs can expose data, more code

2. **API Gateway Authorization**
   - Pros: Centralized, language-agnostic
   - Cons: Another service to manage, doesn't protect direct DB access

3. **RBAC Library (like CASL)**
   - Pros: Flexible, well-tested patterns
   - Cons: Still application-layer, must be applied everywhere

4. **Separate Read Replicas per User**
   - Pros: Complete isolation
   - Cons: Impractical at scale, expensive

## References

- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- Related: [ADR: Use Supabase as Backend Infrastructure](./20250122-use-supabase-as-backend-infrastructure.md)
