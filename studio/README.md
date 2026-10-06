# Positiv Studio

The Sanity Studio where Editors change the Public Site's content. It is its own
pnpm workspace package, deployed to Sanity's hosting at
<https://positiv.sanity.studio>, and never ships with the app — see
[Host the Sanity Studio as its own workspace package](../docs/architecture/decisions/20260924-host-the-sanity-studio-as-its-own-workspace-package.md).

- Project `8ojkallk`, datasets `production` and `development`, both public.
- Field titles and descriptions are in Brazilian Portuguese; schema names are
  in English.

## Layout

| Path                                | What it holds                                                                    |
| ----------------------------------- | -------------------------------------------------------------------------------- |
| `schemas/objects/rich-text.ts`      | Short Portable Text: paragraphs, bold, italic, links — subtitles, cards, bios    |
| `schemas/objects/long-rich-text.ts` | Long Portable Text: adds h2, h3, blockquote and lists — the Rich Text Section    |
| `schemas/objects/seo.ts`            | A Page's SEO: title, description, share image, noIndex                           |
| `schemas/objects/site-link.ts`      | A label and exactly one target, a Page or a URL — the Navigation and footer      |
| `schemas/documents/`                | `page`, `person`. Singletons: `homepage` (until `/` replaces it), `siteSettings` |
| `schemas/page-header/`              | The three Page Header forms: Homepage Hero, Hero and Title                       |
| `schemas/sections/`                 | One object type per Section                                                      |
| `app/reserved-addresses.ts`         | The first address segments the Platform uses — owned by the app, imported here   |
| `page-actions.ts`                   | Keeps the Page at `/` from being deleted or unpublished                          |
| `structure.ts`, `singletons.ts`     | The desk: both "Página inicial", "Páginas", "Configurações do site", "Pessoas"   |
| `seed/`                             | The development seed — see below                                                 |
| `migrations/`                       | Content migrations — see below                                                   |

A field's `validation` replaces the validation of the type it uses. A field
of type `richText` or `longRichText` that adds its own rule —
`rule.required()`, say — must chain `.custom(richTextProblem)` from
`rich-text.ts` or `.custom(contentProblem)` from `long-rich-text.ts`, or the
text's content rule stops running. `schemas/objects/rich-text-fields.test.ts`
walks every type in the schema and fails on such a field.

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

### Pages and their addresses

A Page's address is stored with its leading slash: `/` is the Homepage,
`/sobre` and `/sobre/equipe` are others. Its first segment may not be one of
`app/reserved-addresses.ts`, so a Page never shadows a Platform route. When a new
top-level route lands in `app/routes.ts`, add its segment there;
`app/reserved-addresses.test.ts` fails until you do. The list lives in the app
because it mirrors the app's routes; the Studio imports it across the workspace,
so keep that file free of imports or the Studio build starts pulling in app code.

The Homepage Hero and the Hero have the same fields today, on purpose: they
are different Page Header forms that render differently, and only the
Homepage Hero is allowed at `/`. Keep them as two types.

The Page at `/` always has the id `page-home`; the address rule ties the two
together. The Studio hides its delete and unpublish actions, but only the
Studio: the API and the CLI can still remove it.

### Site Settings

Site Settings hold the Navigation, the footer and the Notice, at the fixed id
`siteSettings`. Like the old homepage, the Studio keeps only publish, discard
changes and restore on it, so it cannot be deleted, duplicated or
unpublished from the desk.

Every link in the Navigation and the footer columns is a `siteLink`: a label
plus either a Page or a URL, never both. The URL, the social links and the
Desenvolvimento addresses use `hrefRule` from `rich-text.ts`, the same rule as
the rich text link: https or a path starting with `/`. The news dialog is not
here; it stays Platform code.

### Seed development

Development content comes from `seed/seed.ts`, never from edits by hand or
by an agent:

```bash
pnpm --filter studio seed
```

It writes the Page at `/` with every Section type, `/sobre` with a Title,
`/sobre/equipe` with a Hero, two fictional People, and Site Settings with a
Navigation, a full footer and a Notice. It is idempotent —
fixed ids and `createOrReplace` — so run it as often as you like; it
overwrites those documents and nothing else. It refuses any dataset other
than `development`, whatever `SANITY_STUDIO_DATASET` says.

A ticket that adds a Section type or a field extends the seed in the same pull
request; `seed/seed.test.ts` validates every seeded document against the
schema.

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

### Update the e2e fixtures

`e2e/fixtures/homepage-content.json` is what the app's `homepageQuery` returns
from `development`. It feeds the e2e Sanity mock and the unit tests. When the
query or the content changes, regenerate it with a read-only, anonymous query:

From the repository root:

```bash
pnpm --filter studio exec sanity documents query \
  "$(pnpm exec tsx -e 'import { homepageQuery } from "./app/business/cms/homepage-query"; process.stdout.write(homepageQuery)')" \
  --dataset development --anonymous --api-version 2026-09-24 \
  > e2e/fixtures/homepage-content.json
```

`e2e/fixtures/pages-snapshot.json` and `e2e/fixtures/site-settings.json` are
the two halves of the app's `siteSnapshotQuery` — every Page the seed writes and
its Site Settings. Run the seed first, then:

```bash
pnpm --filter studio exec sanity documents query \
  "$(pnpm exec tsx -e 'import { pagesQuery } from "./app/business/cms/pages-query"; process.stdout.write(pagesQuery)')" \
  --dataset development --anonymous --api-version 2026-09-24 \
  > e2e/fixtures/pages-snapshot.json
pnpm --filter studio exec sanity documents query \
  "$(pnpm exec tsx -e 'import { siteSettingsQuery } from "./app/business/cms/site-snapshot-query"; process.stdout.write(siteSettingsQuery)')" \
  --dataset development --anonymous --api-version 2026-09-24 \
  > e2e/fixtures/site-settings.json
```

Commit the fixtures when they change.

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
