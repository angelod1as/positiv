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

## Safety Notes

- **All write operations** should use `mcp__supabase-local__`
- **Production** is read-only via `mcp__supabase-production__`
- The dump files (`production_dump.sql`, `production_data.sql`) are gitignored
- After migration testing, reset local with `supabase db reset`
