# Positiv Studio

The Sanity Studio where Editors change the Public Site's content. It is its own
pnpm workspace package, deployed to Sanity's hosting at
<https://positiv.sanity.studio>, and never ships with the app — see
[Host the Sanity Studio as its own workspace package](../docs/architecture/decisions/20260924-host-the-sanity-studio-as-its-own-workspace-package.md).

- Project `8ojkallk`, datasets `production` and `development`, both public.
- Field titles and descriptions are in Brazilian Portuguese; schema names are
  in English.

## Layout

| Path                            | What it holds                                                          |
| ------------------------------- | ---------------------------------------------------------------------- |
| `schemas/objects/rich-text.ts`  | The one Portable Text definition: paragraphs, bold, italic, links      |
| `schemas/documents/`            | `homepage` (a singleton) and `person`                                  |
| `schemas/sections/`             | One object type per Section of the homepage                            |
| `structure.ts`, `singletons.ts` | The desk: "Página inicial" opens the singleton, "Pessoas" lists people |
| `seed/`                         | The seed command and the pure `buildSeed` behind it                    |
| `migrations/`                   | Content migrations — see below                                         |

## Run it locally

Log in to the Sanity CLI once:

```bash
pnpm --filter studio exec sanity login
```

Then start the Studio at <http://localhost:3333>:

```bash
SANITY_STUDIO_DATASET=development pnpm --filter studio dev
```

Without `SANITY_STUDIO_DATASET` it opens `production`, which is what Editors
use. Work against `development`.

`pnpm lint` and `pnpm test:unit` at the repository root cover the Studio as
well; inside it, `pnpm --filter studio lint`, `test` and `build` run each on
its own.

## Seed

The seed command writes today's homepage copy (`app/copy/homepage.ts`) and the
founders' photos into a dataset, then regenerates
`e2e/fixtures/homepage-content.json` from it:

```bash
pnpm --filter studio seed --dataset development
```

- It runs through `sanity exec --with-user-token`, so it writes as whoever is
  logged in to the CLI. No token to create or store.
- `--dataset` is required. `production` is refused unless
  `--allow-production` comes with it — seeding overwrites the homepage and both
  people with the copy in the repository, discarding whatever Editors published.
- It is idempotent: fixed document ids, `createOrReplace`, and Sanity reuses an
  asset with the same content. Running it twice changes nothing.
- It prints the project and dataset it resolved before writing. Read that line.

Commit the regenerated fixture when it changes.

## Deploy

A merge to `main` deploys the Studio from `.github/workflows/production.yml`
(the `deploy-studio` job), authenticated by the `SANITY_AUTH_TOKEN` repository
secret. Nobody needs to deploy by hand.

The Studio and the app deploy separately, so the Studio's schema is live
minutes before or after the app that reads it.

## Change the schema

Adding a field or a new Section type is one pull request. Renaming or removing
a field is not: it follows
[Sanity schema changes follow expand/contract](../docs/architecture/decisions/20260924-sanity-schema-changes-follow-expand-contract.md).

1. Add the new field beside the old one; deploy the Studio.
2. Migrate existing content with a script in [`migrations/`](./migrations/),
   on `development` first, then on `production`.
3. Deploy the app reading the new field.
4. Remove the old field in a later pull request.

Every validation rule has a test that feeds it a bad value; `test/validate.ts`
runs Sanity's own validator the way the Studio does.
