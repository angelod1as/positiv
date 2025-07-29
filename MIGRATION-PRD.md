# CSV Migration to Production Database

## Overview
Migration of 666 participant records from CSV to Supabase production database.

## Migration Rules

### Data Validation
- **Skip records without email OR phone** (14 records will be skipped)
- Total valid records: ~652

### Field Mappings

#### approved_to_attend
- `"Sim"`, `"TRUE"` → `'approved'`
- `"Ainda não"`, `"Não sei ainda"` → `'pending'`
- `"FALSE"`, `"Não"`, `"Não sei"`, empty → `'rejected'`

#### flag
- empty → `'none'`
- `"🚨"` → `'red'`
- `"🤔"`, `"⚠️"` → `'yellow'`

#### gender (array)
- Split by comma if multiple values
- Map `"NB"` → `"Pessoa não binária"`
- Valid values: "Mulher cis", "Mulher trans", "Travesti", "Pessoa não binária", "Pessoa agênera", "Homem trans", "Homem cis"

#### orientation (array)
- Split by comma if multiple values
- Valid values: "Hétero", "Gay", "Sapatão", "Bi", "Pan", "Demi", "Ace"

#### pronouns (array)
- Parse variations (e.g., "Ele/Dele" → ["Ele/dele"])
- Valid values: "Ele/dele", "Ela/dela", "Elu/delu", "Ile/dile"

#### Other fields
- `phone`: stored as bigint (numeric only)
- `user_id`: NULL for all imported profiles
- `basic_data_filled`: false for all imported profiles
- `created_at`: current timestamp
- `allow_marketing_email`: false (default)

## Event Participants
16 event UUIDs with participant counts:
- d953e0d3-7a5e-4ff3-a161-0b855cf4c164: 40 participants
- 6dfbb35c-6e2a-4bf7-a995-578e0e6dc82f: 37 participants
- 31fd751e-0696-45d7-8811-c3572ff2e33e: 53 participants
- 24b052cb-8e05-4fbc-9195-ef498b03d9d2: 63 participants
- d62174a2-2b23-442b-b43a-9d9d709eea8f: 34 participants
- 19096473-a786-4d29-acf8-11276ed86495: 33 participants
- 1b3a5cdb-cffe-4242-9f2c-de49fb6c2fb7: 40 participants
- 3da9caf4-fd08-4192-9d66-fc636342ae83: 43 participants
- 0b7ef0a3-200d-42a1-b8e6-7ae11dd65c41: 7 participants
- a6912346-dbd0-480a-b05b-e51c85375bef: 47 participants
- e88c71c3-2431-4e1e-ac42-6ae94e89c744: 52 participants
- c08ad562-8559-429f-b5cb-8aae0972707b: 53 participants
- ad7994c6-2ba3-4024-9b4c-9f06d66cce04: 25 participants
- d14286cb-ac70-4caf-83c1-191d59f75a55: 32 participants
- 8415cfbe-c916-4b7a-bf48-abfb3a219f64: 42 participants
- b4ab77d5-ef4d-4cdd-a3af-79c2cfe31274: 0 participants

## Scripts Created
1. `scripts/validate-csv.ts` - Validates CSV data, checks for duplicates
2. `scripts/transform-csv.ts` - Transforms CSV to SQL
3. `migration-profiles.sql` - 662 INSERT statements for profiles
4. `migration-event-participants.sql` - 600 INSERT statements for event_participants

## Progress Checklist
- [x] Create migration worktree
- [x] Validate CSV data
- [x] Remove duplicate phone numbers
- [x] Define mapping rules
- [x] Create transformation script
- [x] Generate profiles SQL
- [x] Generate event_participants SQL
- [ ] Backup production database
- [ ] Test migration locally
- [ ] Execute on production

## Backup Commands

### Full Production Backup
```bash
# 1. Export database schema and data (excluding auth schema)
supabase db dump --db-url "postgresql://postgres.[PROJECT_ID]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres" > prod_backup.sql

# 2. Export auth schema separately (if needed)
supabase db dump --db-url "postgresql://postgres.[PROJECT_ID]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres" --schema auth > prod_auth_backup.sql

# Alternative: Use pg_dump directly
pg_dump "postgresql://postgres.[PROJECT_ID]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres" \
  --clean --if-exists --schema=public > prod_backup.sql
```

### Restore to Local
```bash
# 1. Stop local Supabase
supabase stop

# 2. Start fresh
supabase start

# 3. Restore the backup
psql "postgresql://postgres:postgres@localhost:54322/postgres" < prod_backup.sql

# 4. If auth was backed up separately
psql "postgresql://postgres:postgres@localhost:54322/postgres" < prod_auth_backup.sql
```

## Migration Statistics
- Original CSV records: 677
- After duplicate removal: 666
- Records to skip (no email/phone): 4
- Valid profiles created: 662
- Event participants created: 600
- Records skipped: Caíque Apolinário, Leo Seabra, Matheus Brandão Ponter, Rodrigo Stucker

## Data Quality Notes
- Many custom gender/orientation/pronoun values that don't match constants
- These were logged during transformation but preserved as empty arrays
- Consider manual review of these edge cases

## Notes
- All imported profiles will have `user_id = NULL` (no auth user)
- Phone numbers must be unique in the database
- Migration preserves general_notes in a separate tracking table (TBD)