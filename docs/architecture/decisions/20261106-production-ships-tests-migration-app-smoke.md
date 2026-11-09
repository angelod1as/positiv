# Production ships in one order: tests, migration, app, smoke

- Status: accepted
- Date: 2026-11-06
- Tags: architecture, deployment, database

## Context

The app and the schema reached production by separate paths. Coolify built `main` from its own push webhook, while `production.yml` ran `supabase db push` only after the unit tests passed. On 2026-11-06 the unit tests failed on `main`, the migration never ran, and Coolify published the app anyway: the payment link by token went down reading a column that did not exist (WEB-39). POS-520 was the same race from the other side, a migration gate that hung while the app went live.

## Decision

`production.yml` is the only thing that publishes the app, in this order:

1. `unit-test`
2. `deploy` runs `supabase db push`, after a pre-deploy dump.
3. `deploy-app` starts the Coolify deployment through its API.
4. `smoke` waits for that deployment to finish, checks it built this run's commit, then fetches the site.

A failed step stops every step after it, so a red `main` publishes nothing.

Coolify's auto-deploy is off for the `Positiv` application. The workflow authenticates with `COOLIFY_DEPLOY_TOKEN`, a Coolify API token with the `deploy` and `read` abilities only, and reaches the panel at `COOLIFY_URL`. Both are GitHub secrets.

Runs share a concurrency group that never cancels a run in progress. Coolify builds the head of `main`, not a given commit, so `deploy-app` publishes only while `main` still points at its run's commit; otherwise the newer run, queued behind it, migrates and publishes. A narrow window remains: Coolify resolves the head when the build starts, so a merge landing between the check and the build start is built early. The smoke test's commit comparison turns that case into a red run.

## Consequences

### Positive

- An app no longer reaches production before the schema it reads, outside the narrow window above, which ends the run red.
- The smoke test proves the new app is live, not just that something answers 200.

### Negative

- Runs hold the `production` concurrency group until the smoke test finishes, up to about an hour in the worst case. A hotfix merged meanwhile waits to migrate, and a third merge replaces the waiting run.
- The app goes live a few minutes later than before: after the tests and the migration instead of in parallel with them.
- A migration lands while the previous app is still serving, so it must stay compatible with it. Expand/contract was already the rule; now it is required.
- A run that leaves publishing to a newer run ends green with a warning. If that newer run goes red, the older commit's migration is live while the app stays on the commit before it, until the next green merge publishes both. That is the rule working: a red `main` publishes nothing.
- Deploying by hand means running `production.yml` (workflow dispatch) or using the Coolify panel, which skips the gate.

### Neutral

- The Sanity Studio still deploys beside the migration, as before.

## Alternatives Considered

1. **Keep Coolify's webhook and make the app tolerate a missing migration**
   - Pros: no deploy plumbing in CI.
   - Cons: every feature would need to guard against its own schema being absent; one miss repeats the outage.

2. **Pin Coolify to a commit through the API before deploying**
   - Pros: the build would be exactly this run's commit.
   - Cons: needs a token with `write` on the application, far more than deploying requires; the head check gets nearly the same guarantee, short of the window above, which the smoke test catches.
