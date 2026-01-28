# CI/CD Workflow Documentation

## Overview

This document explains how our Continuous Integration and Deployment workflows function, specifically focusing on how we handle database migrations and testing across different environments.

## Environment Strategy

We use a **two-environment** approach:

| Environment | Usage | Database | When |
|------------|-------|----------|------|
| **Local** | Development | Supabase local | Day-to-day development |
| **Production** | Live application | Supabase hosted | After merge to `main` |

### What Happened to Staging?

**Previously**, we had a staging environment that was shared across all PRs. This caused significant problems:

- **Blocking PRs**: When multiple PRs had database migrations, they would conflict
- **Serial Development**: Developers had to wait for PRs to merge sequentially
- **Unreliable Tests**: E2E tests would fail due to schema mismatches from other PRs

**Now**, each PR gets its own **ephemeral local Supabase instance** in CI. This means:

- ✅ Multiple PRs can run simultaneously without conflicts
- ✅ Each PR tests against its own isolated database
- ✅ No shared state = no interference between PRs
- ✅ Faster development cycle (no waiting for other PRs)

## CI Workflows

### Pull Request Workflow (`deploy-and-test.yml`)

Triggered on: Pull requests to `main`

#### Job 1: `validate-schema`

**Purpose**: Validate that TypeScript types match the database schema

**Steps**:
1. Checkout code
2. Setup Supabase CLI
3. Start local Supabase instance
4. Generate TypeScript types from schema
5. Verify types match committed files
6. Stop local Supabase instance

**Why**: Ensures database types are always in sync with the schema before merging

---

#### Job 2: `unit-test`

**Purpose**: Run unit and integration tests

**Steps**:
1. Checkout code
2. Install dependencies (pnpm)
3. Run `pnpm test:coverage`
4. Upload coverage reports

**Why**: Fast feedback on code quality without database dependencies

---

#### Job 3: `e2e-test`

**Purpose**: Run end-to-end tests against a local Supabase instance

**Dependencies**: Requires `validate-schema` and `unit-test` to pass first

**Steps**:
1. Checkout code
2. **Setup Supabase CLI**
3. **Start local Supabase instance** (fresh database with seeds)
4. **Extract local credentials** (URLs, keys)
5. Install dependencies
6. Install Playwright browsers
7. **Run E2E tests** against local Supabase
8. Upload test reports
9. **Stop Supabase instance** (cleanup)

**Key Point**: Each PR gets its own database! Tests run against `http://127.0.0.1:54321`, not a shared staging environment.

**Environment Variables Used**:
```yaml
VITE_SUPABASE_URL: (from local instance)
VITE_SUPABASE_ANON_KEY: (from local instance)
SUPABASE_SERVICE_ROLE_KEY: (from local instance)
SUPABASE_CONNECT_URL: (from local instance)
```

All other secrets (TEST_USER_PASSWORD, COOKIE_SECRET, etc.) come from GitHub secrets.

---

### Production Deployment (`production.yml`)

Triggered on: Push to `main` branch (after PR merge)

#### Job 1: `unit-test`

Same as PR workflow - ensures tests pass before deploying

---

#### Job 2: `deploy`

**Purpose**: Apply database migrations to production

**Steps**:
1. Checkout code
2. Setup Supabase CLI
3. **Push migrations to production** using `supabase db push`

**Environment Variables**:
```yaml
SUPABASE_ACCESS_TOKEN: (GitHub secret)
SUPABASE_DB_PASSWORD: (GitHub secret - production)
SUPABASE_PROJECT_ID: (GitHub secret - production)
SUPABASE_CONNECT_URL: (GitHub secret - production)
```

**Critical**: This is the ONLY workflow that touches production database!

---

## Database Migrations

### Development Flow

1. **Create migration locally**:
   ```bash
   supabase migration new my_feature
   # Edit the generated SQL file
   ```

2. **Test migration locally**:
   ```bash
   supabase db reset
   # Applies all migrations from scratch
   ```

3. **Commit migration file**:
   ```bash
   git add supabase/migrations/
   git commit -m "feat(db): add my_feature migration"
   ```

4. **Open PR**:
   - CI validates schema types
   - CI runs E2E tests against local DB with your migration
   - Tests run independently of other PRs!

5. **Merge PR**:
   - Migrations automatically apply to production via `production.yml`

---

### Migration Best Practices

Follow the guidelines in [CLAUDE.md](../CLAUDE.md#database-migration-rules):

- **NEVER** modify already-applied migrations
- **ALWAYS** test with `supabase db reset` locally
- **ALWAYS** handle duplicate objects gracefully (use `IF NOT EXISTS`, `DO` blocks)
- **ALWAYS** use proper delimiters for complex SQL

---

## Parallel PR Development

### Scenario: Multiple PRs with Migrations

**Before** (with staging):
```
PR-A (migration 001) → Staging has 001 → ✅ Tests pass
PR-B (migration 002) → Staging has 001 → ❌ Tests fail (missing dependency)
PR-C (no migration)   → Staging has 001 → ❌ Tests fail (schema changed)
```

**Result**: Had to merge PRs one at a time 😞

---

**Now** (with local Supabase):
```
PR-A (migration 001) → Local DB-A → ✅ Tests pass
PR-B (migration 002) → Local DB-B → ✅ Tests pass
PR-C (no migration)  → Local DB-C → ✅ Tests pass
```

**Result**: All PRs can run simultaneously! 🎉

---

## Troubleshooting

### E2E Tests Fail in CI but Pass Locally

**Check**:
1. Are seeds being applied? (They should auto-apply with `supabase start`)
2. Are environment variables correct?
3. Is there a dependency on external services not mocked?

**Debug**:
```bash
# Run E2E tests locally with same setup as CI
supabase start
pnpm test:e2e
supabase stop
```

---

### Migration Fails in Production

**Cause**: Migration works locally but fails in production

**Common Issues**:
1. Production has data that violates new constraints
2. Missing `IF NOT EXISTS` checks
3. Wrong delimiter usage in functions

**Solution**:
1. Create rollback migration
2. Fix forward migration
3. Test both with `supabase db reset` locally
4. Open new PR with fixes

---

### "Supabase is already running" Error in CI

**Cause**: Previous job didn't stop Supabase

**Solution**: The workflow now includes `if: always()` on the stop step to ensure cleanup even if tests fail

---

## GitHub Secrets Required

### For PRs (E2E Tests)
```
TEST_USER_PASSWORD
TEST_USER_ADMIN_EMAIL
COOKIE_SECRET
UNSUBSCRIBE_SECRET
STAGING_TURNSTILE_SITE_KEY  # Still using test keys for now
STAGING_TURNSTILE_SECRET    # Still using test keys for now
LISTMONK_API_URL
LISTMONK_API_USERNAME
LISTMONK_API_PASSWORD
```

Note: Supabase credentials are NOT needed for PRs! They come from the local instance.

---

### For Production Deployment
```
SUPABASE_ACCESS_TOKEN
PRODUCTION_PROJECT_ID
PRODUCTION_DB_PASSWORD
PRODUCTION_SUPABASE_URL
PRODUCTION_SUPABASE_ANON_KEY
PRODUCTION_SUPABASE_SERVICE_ROLE_KEY
PRODUCTION_SUPABASE_CONNECT_URL
```

---

## FAQ

### Q: Why don't we use staging anymore?

**A**: Staging was a **shared bottleneck**. With 2-3 PRs being common, we spent more time waiting than developing. Local instances eliminate this entirely at zero cost.

---

### Q: How do we do manual testing before production?

**A**:
1. Test locally with `pnpm dev` (uses your local Supabase)
2. E2E tests validate critical flows automatically
3. If needed, you can still create a temporary Supabase project for manual QA

---

### Q: What about preview deploys (Vercel/Coolify)?

**A**: Preview deploys can still be created manually if needed, but they're not part of the standard workflow. They would point to a temporary Supabase project or local development.

---

### Q: Does this save money?

**A**: Yes! No staging environment = no staging Supabase costs. CI runs are slightly longer but we gain massive productivity improvements from parallel PRs.

---

### Q: Can I still reset the "staging" database?

**A**: There is no staging database anymore. Each PR gets its own fresh database that's destroyed after tests complete.

---

## Performance Impact

### Before (Sequential PRs)
```
PR-1: Open → Wait for staging → Test → Merge (30 min)
PR-2: Wait for PR-1 → Wait for staging → Test → Merge (1 hour total)
PR-3: Wait for PR-2 → Wait for staging → Test → Merge (1.5 hours total)

Total time: ~2.5 hours for 3 PRs
```

---

### After (Parallel PRs)
```
PR-1: Open → Test with local DB → Merge (30 min)
PR-2: Open → Test with local DB → Merge (30 min)  ← Runs in parallel!
PR-3: Open → Test with local DB → Merge (30 min)  ← Runs in parallel!

Total time: ~30 minutes for 3 PRs (runs simultaneously)
```

**Result**: ~5x faster development cycle!

---

## Related Documentation

- [CLAUDE.md](../CLAUDE.md) - Development guidelines and migration rules
- [Testing Guidelines](./testing-guidelines.md) - How to write and run tests
- [README.md](../README.md) - Project setup and commands

---

## Summary

✅ **Each PR gets its own database** - no more conflicts
✅ **Parallel development** - multiple PRs can run simultaneously
✅ **Zero cost** - local Supabase in CI is free
✅ **Faster feedback** - no waiting for other PRs to merge
✅ **Production unchanged** - same deployment process

**Bottom line**: We trade a small increase in CI time for a massive increase in development velocity.
