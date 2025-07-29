#!/bin/bash
set -euo pipefail

# Configuration
MIGRATION_DIR="${MIGRATION_DIR:-scripts/temp/migration}"
SQL_OUTPUT_DIR="${SQL_OUTPUT_DIR:-$MIGRATION_DIR/output}"

echo "🚀 Positiv Profile Migration"
echo "=========================="

# 1. Pre-flight checks
echo "✓ Checking prerequisites..."
if [[ ! -f "$SQL_OUTPUT_DIR/insert-new-profiles.sql" ]]; then
  echo "❌ Missing insert-new-profiles.sql - run generate-migration-sql.ts first" >&2
  exit 1
fi

if [[ ! -f "$SQL_OUTPUT_DIR/insert-event-participants.sql" ]]; then
  echo "❌ Missing insert-event-participants.sql" >&2
  exit 1
fi

# 2. Database connection check
if [[ "${SKIP_DB_CHECK:-0}" != "1" ]]; then
  echo "✓ Testing database connection..."
  if ! psql "${DATABASE_URL}" -c "SELECT 1" >/dev/null 2>&1; then
    echo "❌ Cannot connect to database"
    exit 1
  fi
fi

# 3. Show migration summary
echo ""
echo "📊 Migration Summary:"

# Count new profiles
profile_count=$(grep -c "INSERT INTO profiles" "$SQL_OUTPUT_DIR/insert-new-profiles.sql" 2>/dev/null || echo 0)
echo "- New profiles: $profile_count"

# Count event participations
participation_count=$(grep -c "INSERT INTO event_participants" "$SQL_OUTPUT_DIR/insert-event-participants.sql" 2>/dev/null || echo 0)
echo "- Event participations: $participation_count"

# 4. Confirmation
if [[ "${AUTO_CONFIRM:-0}" != "1" ]]; then
  echo ""
  echo "⚠️  WARNING: This will modify the database!"
  echo "Type 'MIGRATE' to proceed, anything else to cancel:"
  read -r confirmation

  if [[ "$confirmation" != "MIGRATE" ]]; then
    echo "Migration cancelled."
    exit 0
  fi
fi

# Skip database operations if in test mode
if [[ "${SKIP_DB_CHECK:-0}" == "1" ]]; then
  echo "Test mode: Skipping database operations"
  exit 0
fi

# 5. Create backup point
echo ""
echo "📸 Creating backup checkpoint..."
backup_file="backup-$(date +%Y%m%d-%H%M%S).dump"
pg_dump "${DATABASE_URL}" --format=custom --file="$backup_file"

# 6. Execute migration
echo ""
echo "🔄 Executing migration..."

# Insert new profiles
echo "- Inserting new profiles..."
psql "${DATABASE_URL}" < "$SQL_OUTPUT_DIR/insert-new-profiles.sql"

# Insert event participations
echo "- Creating event participations..."
psql "${DATABASE_URL}" < "$SQL_OUTPUT_DIR/insert-event-participants.sql"

# 7. Verification
echo ""
echo "✅ Migration complete!"
echo ""
echo "📊 Post-migration stats:"
psql "${DATABASE_URL}" <<EOF
SELECT 'Orphan profiles' as metric, COUNT(*) as count
FROM profiles WHERE user_id IS NULL
UNION ALL
SELECT 'Total participations', COUNT(*) 
FROM event_participants;
EOF

echo ""
echo "🎉 Migration successful!"
echo ""
echo "Backup saved as: $backup_file"