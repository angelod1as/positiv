# Production database audit

A recurring health check of the production Supabase database. It is a work
policy, not a ticket: a GitHub Action posts a reminder to Telegram on the 1st of
every month (`.github/workflows/database-audit-reminder.yml`), and whoever picks
it up works through this checklist.

Run it:

- monthly, when the reminder arrives;
- after any PR whose migration rewrites RLS policies or grants.

The audit only reads. Nothing is changed in production from here: every finding
becomes its own ticket (see [Recording findings](#recording-findings)).

## Why

DDL changes are when a missing RLS policy or a stray grant shows up, and the
advisors are the only thing that notices. POS-539 started from a production
database where `anon` could escalate to admin. Indexes and query plans also
drift as the data grows.

Running the advisors after every DDL change is a separate, per-PR rule. It
lives in [CLAUDE.md](../CLAUDE.md), under "After Any DDL Change, Run the
Advisors". This audit is the monthly sweep that catches what slipped past it.

## Checklist

### Security

- [ ] `get_advisors` type `security` (production Supabase MCP). Every ERROR and
      WARN gets a ticket or a documented reason.
- [ ] Every `SECURITY DEFINER` function: no unintended EXECUTE for `anon` or
      `authenticated`. Check with `has_function_privilege`, not by reading the
      migration. The `PUBLIC` grant survives `REVOKE ... FROM anon, authenticated`.

  ```sql
  SELECT p.proname,
         has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute,
         has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authed_can_execute
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.prosecdef
   ORDER BY p.proname;
  ```

- [ ] Every table in `public` has RLS enabled. Any table with a grant but no
      policy, or a policy but no grant, is explained.
- [ ] Default privileges in `public` are still revoked
      (`20260923120000_revoke_public_default_privileges.sql`). A new object gets
      no grant unless its migration gives one.
- [ ] `user_roles` / `role_permissions`: only the expected roles and permissions
      exist, and the list of admin and staff users matches who should have them.

### Performance

- [ ] `get_advisors` type `performance`. Triage unindexed foreign keys,
      duplicate indexes and unused indexes.
- [ ] Slowest queries (`pg_stat_statements`). Anything new since the last audit
      gets a ticket.
- [ ] Table and index sizes: note growth since the last audit.

### Platform

- [ ] Postgres version: outstanding security patches
      ([WEB-4](https://partypositiv.atlassian.net/browse/WEB-4)).
- [ ] Backups: the latest run of the Database Backup workflow succeeded.
- [ ] Applied migrations in production match `supabase/migrations/` on `main`.

## Known exceptions

Accepted on purpose. Do not raise them again.

- **Leaked-password protection** (security advisor WARN): needs the Supabase Pro
  plan, which the account does not have.
- **`provider_plan_id` indexes** (performance advisor, 0 scans): do not drop
  them. They serve the live card-installment path.
- An index at 0 scans on a payments table is a signal to investigate, not to
  drop.

## Recording findings

- Every finding becomes its own ticket in the Jira project `WEB`, with the label
  `banco-de-dados`, written in Portuguese.
- A finding accepted on purpose goes into [Known exceptions](#known-exceptions)
  through a PR, with the reason.
- The audit is done when every item above is checked and every finding has a
  ticket or a recorded exception.
