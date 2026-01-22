# Mailing Migration - Local Test Environment

This document describes the setup for testing the mailing migration with production data locally.

## MCP Configuration

Two Supabase MCP servers are configured:

| MCP Server | Target | Purpose |
|------------|--------|---------|
| `mcp__supabase-local__` | Local Supabase | Safe for writes |
| `mcp__supabase-production__` | Production Supabase | Read-only reference |

## Current Data Counts (Production Dump - Jan 2026)

| Table | Count |
|-------|-------|
| profiles | 944 |
| events | 30 |
| event_participants | 1,165 |
| newsletter_subscriptions | 91 |
| user_roles | 4 |

## Restoring Production Data Locally

### Step 1: Create Fresh Production Dumps

```bash
cd /Users/angelodias/Documents/GIT/private/positiv-project/positiv

# Dump data only (credentials from your environment/1Password)
supabase db dump --db-url "$PROD_DB_URL" --data-only --use-copy -f production_data.sql
```

### Step 2: Reset Local Database

```bash
# Reset database (runs migrations + seed)
supabase db reset

# Clear seed data
psql "$LOCAL_DB_URL" -c \
  "TRUNCATE auth.users, profiles, events, event_participants, newsletter_subscriptions, user_roles CASCADE;"
```

### Step 3: Restore Production Data

```bash
psql "$LOCAL_DB_URL" -f production_data.sql
```

**Note:** Some errors about `auth.oauth_*` tables and storage permissions are expected and can be ignored.

### Step 4: Verify Counts

Use the local MCP to verify data was restored correctly.

## Resetting After Migration Testing

To return to normal seed data:

```bash
supabase db reset
```

## Pre-Migration Backup and Rollback

Before running any migration operations, create a backup of the affected tables.

### SQL Scripts

| Script | Purpose |
|--------|---------|
| `01_create_backup.sql` | Creates backup tables (`_backup_profiles`, `_backup_events`, `_backup_event_participants`) |
| `02_verify_backup.sql` | Verifies backup exists and shows differences from current state |
| `03_rollback.sql` | Restores data from backup tables (⚠️ destructive) |
| `04_cleanup_backup.sql` | Removes backup tables after migration is verified |

### Backup Procedure

```bash
# Set your local DB URL
export LOCAL_DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"

# 1. Create backup BEFORE migration
psql "$LOCAL_DB_URL" -f scripts/mailing-migration/01_create_backup.sql

# 2. Verify backup was created
psql "$LOCAL_DB_URL" -f scripts/mailing-migration/02_verify_backup.sql
```

### Rollback Procedure (if needed)

```bash
# 1. Verify backup state first
psql "$LOCAL_DB_URL" -f scripts/mailing-migration/02_verify_backup.sql

# 2. Run rollback (⚠️ this replaces all data in profiles, events, event_participants)
psql "$LOCAL_DB_URL" -f scripts/mailing-migration/03_rollback.sql

# 3. Verify rollback was successful
psql "$LOCAL_DB_URL" -f scripts/mailing-migration/02_verify_backup.sql
```

### Cleanup (after successful migration)

```bash
# Only run after migration is FULLY verified and you don't need to rollback
# The script requires uncommenting the DROP statements as a safety measure
psql "$LOCAL_DB_URL" -f scripts/mailing-migration/04_cleanup_backup.sql
```

### What Gets Backed Up

| Table | Rows (as of Jan 2026) | Notes |
|-------|----------------------|-------|
| profiles | 945 | User profiles |
| events | 30 | All events |
| event_participants | 1,165 | Participation records |

### Important Notes

- Backup tables are prefixed with `_backup_` and include a timestamp column
- Rollback uses DELETE + INSERT (not TRUNCATE) to avoid cascading to unrelated tables
- The rollback will delete newsletter_subscriptions linked to profiles (due to FK cascade)
- Always verify backup exists before proceeding with migration

## Safety Notes

- **All write operations** should use `mcp__supabase-local__`
- **Production** is read-only via `mcp__supabase-production__`
- The dump files (`production_dump.sql`, `production_data.sql`) are gitignored
- After migration testing, reset local with `supabase db reset`
