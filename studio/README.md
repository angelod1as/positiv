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
| `migrations/`                   | Content migrations — see below                                         |

## Run it locally

Log in to the Sanity CLI once:

```bash
pnpm --filter studio exec sanity login
```

Then start the Studio at <http://localhost:3333>:

```bash
pnpm --filter studio dev
```

It opens `development` unless `SANITY_STUDIO_DATASET` says otherwise, and so
does every CLI command run without `--dataset`. To open `production`, which is
what Editors use and where a click publishes or deletes live content, ask for
it on purpose:

```bash
SANITY_STUDIO_DATASET=production pnpm --filter studio dev
```

The variable is inlined at build time: `pnpm --filter studio build` without it
builds a Studio that opens `development`.

`pnpm lint` and `pnpm test:unit` at the repository root cover the Studio as
well; inside it, `pnpm --filter studio lint`, `test` and `build` run each on
its own.

## Content

Sanity is the source of truth for the Public Site's content: Editors change it
in the Studio, and the repository keeps no copy of it — see
[No repository fallback for Public Site content](../docs/architecture/decisions/20260924-no-repository-fallback-for-public-site-content.md).

### Refresh development from production

Only if `development` has drifted too far to be useful. The export reads
production; the import writes to `development` alone, replacing documents with
the same ids:

```bash
cd studio
pnpm exec sanity datasets export production production.tar.gz
pnpm exec sanity datasets import production.tar.gz --dataset development --replace
rm production.tar.gz
```

Check the dataset name on the import line twice. Never import into
`production`.

### Update the e2e fixture

`e2e/fixtures/homepage-content.json` is what the app's `homepageQuery` returns
from `development`. It feeds the e2e Sanity mock and the unit tests. When the
query or the content changes, regenerate it with a read-only, anonymous query:

```bash
cd studio
pnpm exec sanity documents query \
  "$(pnpm --dir .. exec tsx -e 'import { homepageQuery } from "./app/business/cms/homepage-query"; process.stdout.write(homepageQuery)')" \
  --dataset development --anonymous --api-version 2026-09-24 \
  > ../e2e/fixtures/homepage-content.json
```

Commit the fixture when it changes.

## Deploy

A merge to `main` deploys the Studio from `.github/workflows/production.yml`
(the `deploy-studio` job), authenticated by the `SANITY_AUTH_TOKEN` repository
secret. The job sets `SANITY_STUDIO_DATASET=production`, so the deployed Studio
opens `production`; `scripts/production-workflow.test.ts` fails if it goes
missing. Nobody needs to deploy by hand.

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
