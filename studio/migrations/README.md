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

## Migrations

### `homepage-to-page` (POS-582)

Copies the `homepage` document into the Page at `/` (`page-home`): title
"Início", a Homepage Hero built from `homepage.hero`, today's six sections
in today's order and the site's root description as the SEO description.
It `createOrReplace`s `page-home` and never writes `homepage`, so it is safe
to re-run: each run overwrites the Page with the current homepage.

It runs through `sanity exec` rather than `sanity migrations run`, so that
`--dataset` is required instead of defaulting to `development`. It dry-runs
— printing the Page it would write — until you add `--no-dry-run`.

From the repository root, `development` first:

```sh
pnpm --filter studio migrate:homepage-to-page --dataset development
pnpm --filter studio migrate:homepage-to-page --dataset development --no-dry-run
```

Then `production`:

```sh
pnpm --filter studio migrate:homepage-to-page --dataset production
pnpm --filter studio migrate:homepage-to-page --dataset production --no-dry-run
```

Check the Page in the Studio afterwards. If `page-home` has an unpublished
draft, the Studio shows the draft over the migrated Page: discard it.

On `development` the migration replaces the `page-home` the seed wrote, which
showcases every Section type. Run `pnpm --filter studio seed` to restore it.
