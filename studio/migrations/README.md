# Content migrations

Scripts that rewrite existing content after a schema change, run by hand
against one dataset at a time — `development` first, then `production`.

A migration is step 2 of
[Sanity schema changes follow expand/contract](../../docs/architecture/decisions/20260924-sanity-schema-changes-follow-expand-contract.md):
the new field already exists in the deployed Studio, and the app does not read
it yet.

- Create one with `pnpm --filter studio exec sanity migrations create "<title>"`
  and run it with
  `pnpm --filter studio exec sanity migrations run <id> --dataset <name>`.
  It dry-runs until you add `--no-dry-run`.
- Always pass `--dataset`. Without it the CLI takes the dataset from
  `sanity.cli.ts`, which is `development` unless `SANITY_STUDIO_DATASET` is
  set.
- Make every migration idempotent: running it twice must leave the content as
  running it once does.
- Keep the script after it runs. It is the record of how production's content
  got its shape.
