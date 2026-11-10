# Server-side code is organized by domain

- Status: accepted
- Date: 2026-11-06
- Tags: architecture, development

## Context

As of 2026-11-06, server-side code had no single home. Most of it sat in `app/business/`, which CLAUDE.md described as split by actor (`admin`, `auth`, `participant`) while most of its folders were actually domains (`payment`, `newsletter`, `cms`, `email`). Part of it lived elsewhere: eight route files ran their own queries, `app/pages/payment/payment-page.server.ts` held 284 lines of payment logic, two modules (`~/kysely-db` and `~/lib/supabase/db.server`) both handed out the database, API routes were split between `app/routes/` and `app/pages/api/`, and `app/business/admin/admin.server.ts` mixed event, application, profile and auth code in one 800-line file. Domains also import each other in cycles (`email ↔ cms`, `payment ↔ email`, `payment ↔ settings`, `payment ↔ cms`).

## Decision

**`app/business/<domain>/` is split by domain, never by actor.** Who calls a function is the route's concern and the permission check's, not the folder's. The domains are `auth`, `profile`, `event`, `application`, `payment`, `newsletter`, `email`, `cms`, `feedback`, `settings` and `reporting`. A domain holds its logic and its queries, called through Kysely from its `*.server.ts` files; there is no separate repository layer. Two domains are not entities: `reporting` holds read-only back-office aggregates that span several domains (dashboards, dataviz, demographics, profile search), and `settings` holds the app-wide configuration stored in the database. A function that changes data never goes in `reporting`. `settings` stores and reads the flags an admin edits for the whole app (such as whether online payments are on); the domains read those flags, and `settings` never imports another domain.

**A vendor SDK lives inside the domain that owns it, and only that domain imports it**: Asaas in `payment`, Listmonk in `newsletter`, Sanity in `cms`, nodemailer in `email`. Other domains call the owner's functions. A formal port (an interface with swappable adapters) exists only where swapping the vendor is a real prospect, which today means payments ([Payments go through a provider connector](./20260930-payments-go-through-a-provider-connector.md)).

**`app/lib/` is shared infrastructure with no domain knowledge.** The database is reached only through `~/lib/supabase/db.server`. Request helpers go in `lib/request/` (client IP, Turnstile, `readFormData`), environment checks in `lib/env/`. Helpers shared by client and server stay in `lib/helpers/`.

**Dependencies point one way: `pages → business → lib`.** `lib` never imports `business`. A domain may import another domain's files directly, with no barrel, but never in a cycle.

**Route modules are thin.** A loader or action in `app/pages/` parses the request, calls `business`, and shapes the response. It never imports Kysely, `pg`, `db.server` or the Supabase server client, and never calls supabase-js `.from`, `.rpc` or `.auth`; auth flows (sign-in, OTP confirmation, password reset) call `business/auth`. Every API route, browser-facing or machine-to-machine (cron, webhook), lives in `app/pages/api/`, mirroring its URL.

**A file that imports a server-only module carries the `.server` suffix.** This extends [Use Server-Only File Suffixes](./20250126-use-server-only-file-suffixes.md), which covers server-only code itself: the suffix now also applies transitively, to any file that imports a server-only module (`pg`, `kysely`, `nodemailer`, `db.server`, or another `.server` file). Two exemptions: type-only imports (`import type`), which are erased at build time, and route modules registered in `app/routes.ts`, whose `loader` and `action` React Router strips from the client bundle. The route-module exemption holds only while server code is reached from `loader` and `action` alone: another export (`meta`, the component) that uses it still ships it to the client. WEB-43 will add a test that enforces it.

**From WEB-43 on, `dependency-cruiser`, run inside `pnpm lint`, enforces these rules**: no import cycles, `lib` never imports `business`, `pages` never reaches the database, a vendor SDK is imported only by its owning domain, and `settings` imports no other domain. `pg` is imported only by `lib/supabase/`; Kysely itself (`sql`, its types) may be imported by `business` and `lib`, never by `pages`. Until WEB-43 lands, nothing checks these rules.

The migration is two tickets: WEB-42 moves the code without changing behavior, one commit per domain, in a window when no other work touches `app/business`, `app/pages` or `app/routes`. WEB-43 breaks the cycles and turns on the guard.

## Consequences

### Positive

- One answer to "where does this go": the domain it belongs to. An event's code is in `event/` whether an admin or a participant triggers it.
- A route file can be read without knowing the schema, and the queries it depends on can be tested without a request.
- Vendor changes stay inside one folder.
- The guard catches drift in review instead of in the next reorganization.

### Negative

- WEB-42 touches nearly every server file and conflicts with any branch open at the same time.
- Breaking the existing cycles may need a function to move to a third place, which is more than a rename. `payment ↔ settings` is resolved on the `settings` side: its import of `paymentProvider` goes, since `settings` imports no other domain.
- Some functions sit on a boundary (an admin action that changes an application) and need a judgment call; the rule is to follow the entity the function changes.

### Neutral

- No runtime behavior changes; URLs stay the same.
- `app/components/`, `app/copy/` and the client-side code are untouched.

## Alternatives Considered

1. **Split by actor (`admin`, `participant`, `auth`)**, as CLAUDE.md described.
   - Pros: matches the permission model at a glance.
   - Cons: splits one concept across folders (invites lived in both `admin/` and `participant/`), and most of the folder had already drifted to domains.

2. **Split by layer (`services/`, `repositories/`, `integrations/`)**.
   - Pros: familiar from larger frameworks.
   - Cons: one feature spreads across several folders, and a repository layer adds ceremony a one-developer app with ~1000 users does not need.

3. **A shared `app/integrations/<vendor>/` folder**.
   - Pros: all vendor code in one place.
   - Cons: each vendor already has exactly one owning domain, so the folder only adds a hop.

4. **ESLint `import-x/no-cycle` plus `no-restricted-imports` as the guard**.
   - Pros: no new tool.
   - Cons: the rules scatter across several ESLint blocks, and `no-cycle` is slow on a codebase this size.

5. **One ticket per domain** for the migration.
   - Pros: smaller PRs.
   - Cons: thirteen tickets (one for each of the eight domains that move, plus the database handle, `lib`, the API routes, the cycles and the guard), thirteen branches conflicting with each other and with everything else for weeks; a move-only PR is reviewable commit by commit anyway.

## References

- WEB-41, WEB-42, WEB-43
- [Use Server-Only File Suffixes](./20250126-use-server-only-file-suffixes.md)
- [Use Kysely as SQL Query Builder](./20250125-use-kysely-as-sql-query-builder.md)
- [Payments go through a provider connector](./20260930-payments-go-through-a-provider-connector.md)
- <https://github.com/sverweij/dependency-cruiser>
