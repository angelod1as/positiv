# Use Server-Only File Suffixes (.server.ts)

- Status: accepted
- Date: 2025-01-26
- Tags: architecture, security, build

## Context

In a full-stack React Router application with SSR, code can run on both server and client. This creates risks:

- Server secrets (API keys, database URLs) accidentally bundled to client
- Database queries included in client bundle
- Larger-than-necessary client bundles
- Security vulnerabilities from exposed server code

## Decision

We enforce the `.server.ts` / `.server.tsx` suffix convention for all server-only code:

- **Database access**: `db.server.ts`, `*.server.ts` in `/business`
- **Environment variables**: `env.server.ts`
- **Server utilities**: Any code touching Node.js APIs or secrets

React Router's build system excludes `.server.*` files from the client bundle entirely.

```
/app
  /lib/supabase/db.server.ts     # Database client - never on client
  /business/auth/auth.server.ts   # Auth logic - never on client
  /env.server.ts                  # Environment vars - never on client
```

## Consequences

### Positive

- Build-time enforcement: server code physically cannot reach client
- Clear visual indicator of server-only code
- Smaller client bundles (no dead code to tree-shake)
- Security by architecture, not discipline
- IDE support: easy to search for server-only files

### Negative

- Must remember to add suffix for new server code
- Some duplication if utilities are needed on both sides
- Slightly more verbose file names
- Team must understand the convention

### Neutral

- Standard React Router/Remix convention, well-documented
- No runtime cost
- Works with existing ESLint rules

## Alternatives Considered

1. **Directory-based separation (`/server`, `/client`)**
   - Pros: Clear physical separation
   - Cons: Breaks colocation, harder to navigate related code

2. **Runtime checks (`if (typeof window === 'undefined')`)**
   - Pros: No naming convention needed
   - Cons: Code still bundled, just not executed; easy to forget

3. **Environment variable checks**
   - Pros: Flexible
   - Cons: Still bundled, runtime overhead, not type-safe

4. **Separate packages/workspaces**
   - Pros: Complete isolation
   - Cons: Overkill for most apps, complex setup

## References

- [React Router Server Modules](https://reactrouter.com/how-to/server-only-modules)
- [Remix .server Convention](https://remix.run/docs/en/main/file-conventions/-server)
