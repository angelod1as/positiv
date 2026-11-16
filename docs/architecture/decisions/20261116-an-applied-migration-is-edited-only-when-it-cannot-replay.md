# An applied migration is edited only when it can no longer replay

- Status: accepted
- Date: 2026-11-16
- Tags: database, migrations

## Context

Production moved from Postgres 15 to 17 on 2026-11-16 (WEB-4), and `supabase/config.toml` followed it so local development and CI run the same major version. The first migration, `20250421140932_remote_schema.sql`, runs `CREATE EXTENSION IF NOT EXISTS pgjwt`, and the Postgres 17 image no longer ships pgjwt. A fresh database therefore fails on that line, before any later migration can run, so the usual remedy, a new migration that undoes the old one, cannot reach it.

## Decision

The `pgjwt` line was removed from `20250421140932_remote_schema.sql`, and a new migration, `20261116220000_drop_pgjwt.sql`, drops the extension wherever it still exists.

The rule against editing an applied migration still stands. It has one exception: an applied migration may be edited when it can no longer replay on a fresh database because the platform removed something it depends on. The edit removes only the failing statement. A new migration brings every existing database to the same end state. The edit is approved explicitly in the pull request.

## Consequences

### Positive

- Every migration replays on Postgres 17, so `supabase db reset` and CI build the same schema production has.
- The exception is written down instead of being a precedent nobody can find.

### Negative

- The edited file no longer matches what production ran in April 2025. Supabase tracks migrations by version, not by checksum, so `db push` does not notice. Someone diffing the history against production has to know about this edit.

### Neutral

- Production is untouched: it never replays an applied migration, and its pgjwt was already dropped from the dashboard before the upgrade.

## Alternatives Considered

1. **Keep local and CI on Postgres 15**
   - Pros: No migration is edited.
   - Cons: Local and CI drift from production on the major version, and `config.toml` says that must not happen.

2. **Squash the history into a new baseline**
   - Pros: No old file is edited.
   - Cons: It rewrites every migration to fix one line and breaks every worktree's applied-version history.
