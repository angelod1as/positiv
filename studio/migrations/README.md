# Content migrations

One-shot scripts that rewrite existing content after a schema change, run by
hand once per dataset — `development` first, then `production` — and **deleted
once they have run against `production`**. They read as live code but are dead
after their single run, and re-running one can clobber Editors' content.

A migration is step 2 of
[Sanity schema changes follow expand/contract](../../docs/architecture/decisions/20260924-sanity-schema-changes-follow-expand-contract.md):
the new field already exists in the deployed Studio, and the app does not read
it yet.

The record of how `production`'s content got its shape is git history, not the
tree: the commit that deletes a migration names the migration and the date it
was applied to `production`.

## How to do a one-shot migration

1. **Create it.** Either `pnpm --filter studio exec sanity migrations create
   "<title>"`, or — as the now-deleted ones did (see git history) — a `cli.ts`
   run through `sanity
   exec migrations/<name>/cli.ts --with-user-token --`, which forces `--dataset`
   instead of letting it default to `development`.
2. **Dry-run by default.** The script prints what it would write and changes
   nothing until you pass `--no-dry-run`.
3. **Always pass `--dataset` explicitly.** Without it the CLI takes the dataset
   from `sanity.cli.ts`, which is `development` unless `SANITY_STUDIO_DATASET`
   is set.
4. **Make it idempotent.** Running it twice must leave the content as running it
   once does — `createOrReplace` or `createIfNotExists` on a fixed id, or a
   patch that only touches documents that exist.
5. **Run `development` first, then `production`.** Dry-run, apply with
   `--no-dry-run`, check the Studio, then repeat against `production`.
6. **Delete the script once it has run against `production`,** and say so in the
   deletion commit message — the migration's name and the date it was applied.
   Do not keep it around: a re-run (including a retry after a half-failed
   deploy) can silently overwrite an Editor's changes.

If a migration leaves behind code that other parts of the Studio still use —
the way `code-of-conduct-to-page` left the page content the seed writes — move
that code out of `migrations/` into its real home before deleting the
migration.
