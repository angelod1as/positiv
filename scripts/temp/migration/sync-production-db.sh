#!/bin/bash

# Script to sync production database with local database
# Usage: ./sync-production-db.sh [--dry-run]

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../../.." && pwd )"
ENV_FILE="$PROJECT_ROOT/.env.vercel.production"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="production-dump-${TIMESTAMP}.sql"
DRY_RUN=false

# Check arguments
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
fi

# Function to display error and exit
error_exit() {
  echo -e "${RED}❌ $1${NC}" >&2
  exit 1
}

# Function to display warning
warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

# Function to display success
success() {
  echo -e "${GREEN}✅ $1${NC}"
}

# Function to display info
info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if .env.vercel.production file exists
if [[ ! -f "$ENV_FILE" ]]; then
  error_exit ".env.vercel.production file not found at $PROJECT_ROOT"
fi

# Load production environment variables
set -a
source "$ENV_FILE"
set +a

# Check required variables
if [[ -z "${SUPABASE_CONNECT_URL:-}" ]]; then
  error_exit "SUPABASE_CONNECT_URL is not defined in .env.vercel.production"
fi

# Load local variables
if [[ -f "$PROJECT_ROOT/.env" ]]; then
  LOCAL_DATABASE_URL=$(grep "^SUPABASE_CONNECT_URL=" "$PROJECT_ROOT/.env" | cut -d '=' -f2- | tr -d '"' | tr -d "'")
else
  error_exit ".env file not found. Run 'cp ../positiv/.env .env' first"
fi

if [[ -z "$LOCAL_DATABASE_URL" ]]; then
  error_exit "LOCAL_DATABASE_URL is not defined in .env"
fi

# Check if local Supabase is running
echo "Checking local database connection..."
if ! psql "$LOCAL_DATABASE_URL" -c "SELECT 1" > /dev/null 2>&1; then
  error_exit "Local Supabase is not running. Run 'supabase start' first"
fi

# Dry-run mode
if [[ "$DRY_RUN" == "true" ]]; then
  echo ""
  echo "========================================="
  echo "         DRY RUN MODE ENABLED"
  echo "========================================="
  echo ""
  
  info "Would perform the following operations:"
  echo ""
  echo "1. Backup production database"
  echo "   - Source: Production Supabase database"
  echo "   - Destination: $BACKUP_FILE"
  echo ""
  echo "2. Clean local database"
  echo "   - Drop public schema"
  echo "   - Recreate public schema"
  echo ""
  echo "3. Restore production data to local database"
  echo "   - Source: $BACKUP_FILE"
  echo "   - Destination: Local Supabase database"
  echo ""
  echo "4. Verify data integrity"
  echo ""
  
  # Show current production database statistics
  info "Production database statistics:"
  echo ""
  
  # Count records in main tables
  PROFILES_COUNT=$(psql "$SUPABASE_CONNECT_URL" -t -c "SELECT COUNT(*) FROM profiles" 2>/dev/null || echo "Error")
  EVENTS_COUNT=$(psql "$SUPABASE_CONNECT_URL" -t -c "SELECT COUNT(*) FROM events" 2>/dev/null || echo "Error")
  PARTICIPANTS_COUNT=$(psql "$SUPABASE_CONNECT_URL" -t -c "SELECT COUNT(*) FROM event_participants" 2>/dev/null || echo "Error")
  
  echo "  - Profiles: $PROFILES_COUNT"
  echo "  - Events: $EVENTS_COUNT"
  echo "  - Event Participants: $PARTICIPANTS_COUNT"
  echo ""
  
  success "No changes were made (dry-run mode)"
  exit 0
fi

# Normal mode - request confirmation
warning "WARNING: This will DELETE ALL local data (seeded data)!"
echo ""
echo "This operation will:"
echo "  1. Create a full backup of the production database"
echo "  2. DELETE all data from the local database"
echo "  3. Restore production data to the local database"
echo ""
read -p "Do you want to continue? (type 'yes' to confirm): " CONFIRM

if [[ "$CONFIRM" != "yes" ]]; then
  info "Operation cancelled"
  exit 0
fi

# 1. Backup production database
info "📥 Downloading production data..."
if ! pg_dump "$SUPABASE_CONNECT_URL" --clean --if-exists --no-owner --no-privileges > "$BACKUP_FILE"; then
  error_exit "Error backing up production database"
fi
success "Backup created: $BACKUP_FILE"

# 2. Clean local database
info "🗑️  Cleaning local database..."
if ! psql "$LOCAL_DATABASE_URL" -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;" > /dev/null 2>&1; then
  error_exit "Error cleaning local database"
fi
success "Local database cleaned"

# 3. Restore data to local database
info "📤 Restoring production data..."
if ! psql "$LOCAL_DATABASE_URL" < "$BACKUP_FILE" > /dev/null 2>&1; then
  error_exit "Error restoring data to local database"
fi
success "Data restored successfully"

# 4. Verify integrity
info "✅ Verifying integrity..."
echo ""

# Count records in main tables
PROFILES_COUNT=$(psql "$LOCAL_DATABASE_URL" -t -c "SELECT COUNT(*) FROM profiles" 2>/dev/null || echo "0")
EVENTS_COUNT=$(psql "$LOCAL_DATABASE_URL" -t -c "SELECT COUNT(*) FROM events" 2>/dev/null || echo "0")
PARTICIPANTS_COUNT=$(psql "$LOCAL_DATABASE_URL" -t -c "SELECT COUNT(*) FROM event_participants" 2>/dev/null || echo "0")
USERS_WITH_ID=$(psql "$LOCAL_DATABASE_URL" -t -c "SELECT COUNT(*) FROM profiles WHERE user_id IS NOT NULL" 2>/dev/null || echo "0")
COMPLETED_EVENTS=$(psql "$LOCAL_DATABASE_URL" -t -c "SELECT COUNT(*) FROM events WHERE event_status = 'Completed'" 2>/dev/null || echo "0")

echo "Local database statistics after synchronization:"
echo "  - Profiles: $PROFILES_COUNT"
echo "  - Events: $EVENTS_COUNT"
echo "  - Event Participants: $PARTICIPANTS_COUNT"
echo "  - Profiles with user_id: $USERS_WITH_ID"
echo "  - Completed events: $COMPLETED_EVENTS"
echo ""

success "Synchronization completed successfully!"
echo ""
info "Backup file preserved at: $BACKUP_FILE"
info "To restore seeded data, run: 'supabase db reset'"