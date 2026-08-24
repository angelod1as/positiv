# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Tasks are often written in Portuguese. Everything you produce is in English —
branch names, commit messages, comments, PR descriptions. The one exception is
user- or admin-facing copy in the UI (the news dialog, for example), which is
Brazilian Portuguese.

## Non-Negotiable Rules

1. **NEVER `@ts-ignore`** — fix the type error properly
2. **NEVER skip tests**
3. **NEVER bypass pre-push hooks**
4. **NEVER** write off a failing test as "unrelated, let's not fix it"
5. **NEVER use barrel exports** (`index.ts` files that only re-export)
6. **NEVER reach the database outside `pnpm test:e2e` / `pnpm test:integration`**
   — both take a cross-worktree lock; running `playwright test` or `vitest
   --config vitest.integration.config.ts` directly lets two suites corrupt each
   other's data
7. Use the Context7 MCP for library/API documentation without being asked
8. To reset the database: `supabase db reset` — no `--local` flag

A PR merges only with tests and lint 100% green. If a test fails, fix it.

## Repository Layout

This repository uses a bare checkout with every worktree — including `main` —
living under `wt/`:

```
positiv/
├── .bare/              # Bare repository: all git objects, no working tree
├── .git                # A file, not a directory: "gitdir: ./.bare"
└── wt/
    ├── main/           # main is a worktree like any other
    ├── pos-483-form-runtime-prototype/
    └── <one per task>/
```

Because `.bare/` holds the objects, worktree commands work from inside any
worktree — there is no parent directory to return to first.

Two supporting projects live in-tree rather than as separate repositories:

- `ops/newsletter/` — Docker Compose stack for the self-hosted Listmonk
  newsletter (deployed via Coolify). Copy `.env.example` to `.env` to run it.
- `.claude/` — shared Claude Code settings and the `worktree-management` skill

### Working with Worktrees

```bash
# From any worktree — create a new one
git worktree add ../<branch-name> <branch-name>

cd ../<branch-name>
cp ../main/.env .env      # env files are not versioned
pnpm install              # always, right after creating it
```

- `git worktree list` — list all worktrees
- `git worktree remove ../<name>` — remove one after its PR merges
- Fast-forward `wt/main` before creating a worktree and after removing one
- Name worktrees descriptively but concisely

## Claude Code Settings

Two files, different lifecycles. Getting this wrong is how database
credentials once ended up committed.

**This repository is public.** When Claude Code records an approved command it
stores the command *verbatim* — so approving `SECRET=value some-command` writes
that secret into `settings.local.json`. Never pass a credential inline on a
command line; use an env file or a secret manager. `settings.json` carries deny
rules for the common cases, but they are a backstop, not a substitute.

The `coolify` MCP server in `.mcp.json` reads `POSITIV_COOLIFY_DOMAIN` and
`POSITIV_COOLIFY_TOKEN` from the shell profile (`~/.zshrc`) — not from `.env`
and not through varlock, so the token never lands in a versioned file.

## Essential Commands

```bash
pnpm dev                 # dev server, port 5173
pnpm lint                # ESLint + type generation + tsc — run before committing
pnpm test                # unit + integration
pnpm test:unit           # unit only
pnpm test:integration    # integration only — takes the database lock
pnpm test:e2e            # E2E — takes the database lock, read the E2E section first
pnpm db:types --local    # regenerate types from local Supabase
```

`pnpm build` and `pnpm start` produce and serve the production build.
`package.json` carries the rest — `test:ui`, `test:watch`, `test:coverage`.

## Database Migration Rules

**CRITICAL**: These rules must be followed to avoid breaking production databases.

### Never Modify Already-Applied Migrations

1. **NEVER** change a migration file after it has been applied to ANY database (local, staging, or production)
2. **NEVER** rename migration files that have already been applied
3. If you need to fix something in an already-applied migration:
   - Create a NEW migration that rolls back the problematic changes
   - Create another NEW migration that applies the correct changes

### Before Pushing Migration Changes

1. **ALWAYS** test migrations locally with `supabase db reset`
2. **ALWAYS** ensure migrations run successfully from a clean state
3. If syncing with staging/production:
   - Use `supabase db pull` to get the current state
   - Create NEW migrations for any additional changes needed
   - Never modify the pulled migrations

### Migration Best Practices

- Make creation idempotent: `CREATE EXTENSION IF NOT EXISTS`, `DROP ... IF
  EXISTS`, and a `DO $$ ... EXCEPTION WHEN duplicate_object THEN null; END $$`
  block around `CREATE TYPE`.

- Nested SQL needs its own delimiter — `$$` inside `$$` does not parse, so a
  job body gets `$job$`:

  ```sql
  PERFORM cron.schedule('job-name', '*/5 * * * *', $job$
    SELECT some_function();
  $job$);
  ```

## High-Level Architecture

### Project Structure

`ls` gives you the tree. These are the parts it does not:

- `app/business/` — domain logic, split by actor (`admin`, `auth`, `email`,
  `participant`). Route files stay thin and call into it.
- `app/pages/` — the routes themselves, mirroring the URL structure. Not to be
  confused with `app/components/pages/`, which holds the components a given
  page renders.
- `app/components/` — atomic design (`atoms`, `molecules`, `organisms`), plus
  `ui` for ShadcN and `forms` for the form layer.
- `app/copy/` — every user-visible string; see Site Copy below.
- `app/lib/supabase/` — the Kysely client and the generated database types.
- `~/*` resolves to `/app/*`.

### Key Architectural Patterns

1. **Database Access**: All database queries use Kysely through the `~/lib/supabase/db.server` module. Types are auto-generated from Supabase schema.

2. **Authentication**: Supabase Auth with SSR support. Auth state is managed through React Router's session handling.

3. **Form Handling**: Consistent pattern using React Hook Form + Zod schemas. Forms are organized in `/app/components/forms`: `runtime` is the form runtime every form runs on, `base` holds the shared field components it renders, and `admin` and `custom` hold the forms built on top.

4. **Email System**: templates in `/app/components/email/templates`, sending logic in `/app/business/email/`. Locally, mail goes to Mailpit, bundled with local Supabase — SMTP on port 54325, web UI at <http://127.0.0.1:54324>. Some emails are fired by database triggers rather than by a request; see Recipes.

5. **Protected Routes**: admin routes verify authentication and the admin role in their loaders.

### Development Guidelines

1. **Database changes**: local Supabase only — never `supabase db push`. After a
   schema change run `supabase db reset`, then `pnpm db:types --local`.

2. **Components**: atomic design. New UI extends ShadcN UI where possible.

3. **Server-only code**: the `.server.ts` suffix keeps a module out of the
   client bundle.

4. **Environment variables**: Every variable the project reads is declared in `.env.schema`, with its type and whether it is required — read that file, never `.env`, which holds the values. Application code reads them through `ENV` from `varlock/env`, not `process.env`. Every variable resolves at runtime; the handful the browser reads carry `@static` and are inlined into the bundle at build time. Adding `@static` to a server-only variable freezes its build-time value into the artifact and lets the bundler delete any `if (ENV.FLAG)` around it — `scripts/env-schema.test.ts` guards that line. The replacement matches `ENV.X` and not `const { X } = ENV`, so the two forms do not behave alike for a `@static` variable: destructuring keeps the runtime read that dot access gives up. Local development requires Supabase setup.

5. No comments in code unless the method is genuinely complex.

### Recipes

Automated email notification fired by a database trigger: the
`email-notification` skill.

### Testing

**Unit** — Vitest and React Testing Library. Tests sit next to the component as
`.test.tsx` or `.spec.tsx`. Config in `vitest.config.ts`, setup in
`app/test/setup.ts`, render helpers in `app/test/test-utils.tsx`.

**Integration** — a real database. Files end in `.integration.test.ts`, run in
the Node environment through `vitest.integration.config.ts`, sequentially,
against local Supabase. Build fixtures with the factories in
`app/test/db-test-utils.ts` and wrap the suite in `setupIntegrationTest` /
`cleanupAfterTest` from `app/test/integration-setup.ts` — the tracker they share
is what lets cleanup find the rows a test created. Copy the shape from an
existing suite; `app/test/registration-limit.integration.test.ts` is a good one.

**TDD is non-negotiable.** Red, green, refactor, in baby steps: the test exists
and fails before the implementation does. A test that fails only because a file
or an import is missing proves nothing — it has to fail on behaviour that stays
testable once the code is there.

**Guidelines**

- Test the exposed API — inputs and outputs, not implementation details
- Focus on user behaviour and interactions
- Prefer accessible queries (`getByRole`, `getByLabelText`); `data-testid` sparingly
- Mock external dependencies and API calls
- Keep tests isolated and independent

## Mandatory Workflow

Two of these steps are gates: work does not continue past them without an
explicit yes.

1. Fetch and fast-forward `wt/main`
2. Create a worktree — never work directly in `wt/main`, every task gets its own
3. Read this file
4. Write a detailed plan, in baby steps
5. **Wait for approval.** Do not start implementing without it.
6. Implement following TDD (red-green-refactor)
7. Run all tests and lint
8. **Ask before opening the PR.** Never open one unprompted.

## Definition of Done

- ⁠A task is not done if the linter is not passing for the whole project
- ⁠A task is not done if the tests are not green for the whole project
- ⁠A task is not done if it has new behavior without tests to ensure the new behavior

## Commit Guidelines

- Minimal commits with detailed descriptions, so the work is reviewable commit
  by commit. Show the commit plan when planning.
- Run the related tests before committing.
- [Conventional Commits](https://www.conventionalcommits.org/):
  `{type}(optional scope): {description}`, imperative mood ("add", not
  "added"), `BREAKING CHANGE:` in the footer when applicable.

## Site Copy

- **Every user-visible string lives in `app/copy/`**, one module per route or
  domain area — `homepage.ts`, `events.ts`, `auth.ts`, and so on. Changing text
  means editing one file there, never a component.
- **Formatting is Markdown inside the string**, rendered through
  `~/components/atoms/copy/copy`. Copy is never JSX, so every file in `app/copy/`
  is a `.ts`.
- **`react/jsx-no-literals` guards the migrated directories.** The block is 4b in
  `eslint.config.js` and fails the build if a literal reappears between JSX tags
  in one of them. It cannot see string props (`ignoreProps: true`), the
  punctuation in `allowedStrings`, or a literal inside a JSX expression container
  — so green lint is not proof a directory is finished. Read the props and the
  ternaries by eye.
- **Some Portuguese is not copy and must never move here**: the values in
  `app/lib/constants/constants.ts` are written to the database, the Listmonk list
  name in `app/business/admin/event-listmonk-sync.server.ts` is an external
  label, and the news items under `news-dialog/items/` have their own workflow.
- Full convention, including the Markdown traps and the `as const satisfies`
  rules: `app/copy/README.md`.

## News Dialog Updates

The news dialog is for users, not a changelog, and most PRs do not earn an item.
Whether a change clears the bar, and how to add one: the `news-dialog` skill.
**Never edit `news-utils.ts`**, and never edit an existing item.

## GitHub Workflow

- ⁠Whenever the user has it, use the GitHub CLI to create pull requests
- ⁠PR titles should not use the Conventional Commit Style. Instead, they should add the Linear ticket(s) to the start of the title, like in "[POS-923, POS-924] Add rake tasks for failed searches import and book brief generation". If no Linear ticket exists, use "[NO-TICKET]" prefix.
- The Linear tasks should also be in the description using keywords like "Solve POS-123" or "Fixes POS-123". For PRs without Linear tickets, use "Fixes NO-TICKET"
- Follow @.github/pull_request_template.md closely — every heading in it gets filled in

## E2E Tests

E2E runs against the production build (`pnpm build`), never the dev server, one
test at a time. Tests live in `/e2e/tests/`, split by authentication state —
`auth/`, `unauthenticated/`, `authenticated/` — and follow user journeys rather
than isolated actions. Page objects extend `BasePage` and carry the wait
strategies. Conventions and how to add a test: [E2E Readme](e2e/README.md).

### Before Running E2E — Other Agents Are Working Too

Most of the time several agents are working in this repository at once, and
every one of them drives the same local Supabase instance. `pnpm test:e2e` and
`pnpm test:integration` go through `scripts/with-db-lock.sh`, which gives one
run at a time an exclusive turn; a second run blocks for up to 30 minutes and
then fails. E2E is the worst offender — it takes ~13 minutes and holds the
database and a port for all of it.

1. **Run E2E once, as the last step.** Code written, unit and integration
   tests green, lint green — then E2E. Never as a mid-task check, never a
   second time "to be sure".
2. **Check the lock before starting**:

   ```bash
   cat "$(git rev-parse --git-common-dir)/db-lock/owner" 2>/dev/null
   ```

   Output — `pid`, the `worktree` it runs from, `started` as a Unix timestamp
   — means another run holds the lock. No output means it is free.
3. **If it is held, do not queue behind it.** Wait and check again; 5 minutes
   is a reasonable default. Do other work in the meantime, or tell the user
   the run is pending.
4. **Never route around the lock.** Calling `playwright test` or `vitest
   --config vitest.integration.config.ts` directly skips it and lets two
   suites corrupt each other's data. Do not delete the lock directory unless
   the `pid` in `owner` is genuinely dead.
### Running Tests

```bash
pnpm test:e2e       # every project
pnpm test:e2e:ui    # Playwright UI, for debugging

pnpm test:e2e --project=chromium                     # unauthenticated
pnpm test:e2e --project=chromium-authenticated-user  # user
pnpm test:e2e --project=chromium-authenticated-admin # admin
```
