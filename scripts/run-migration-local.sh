#!/bin/bash

# Run Migration on Local Database
# This script runs both migration files in the same session

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}CSV Migration Runner${NC}"
echo "===================="

LOCAL_DB_URL="postgresql://postgres:postgres@localhost:54322/postgres"

# Check if migration files exist
if [ ! -f "migration-profiles-upsert.sql" ]; then
    echo -e "${RED}Error: migration-profiles-upsert.sql not found${NC}"
    echo "Run the transformation script first: pnpm tsx scripts/transform-csv-upsert.ts"
    exit 1
fi

if [ ! -f "migration-event-participants-upsert.sql" ]; then
    echo -e "${RED}Error: migration-event-participants-upsert.sql not found${NC}"
    exit 1
fi

# Check if local Supabase is running
supabase status > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo -e "${RED}Local Supabase is not running. Start it with: supabase start${NC}"
    exit 1
fi

echo -e "${YELLOW}This will run the migration on your local database.${NC}"
read -p "Continue? (y/n): " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migration cancelled."
    exit 0
fi

# Create a combined SQL file that runs both in the same session
COMBINED_FILE="migration-combined-${TIMESTAMP}.sql"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "-- Combined migration file" > "$COMBINED_FILE"
echo "-- Generated: $(date)" >> "$COMBINED_FILE"
echo "" >> "$COMBINED_FILE"
cat migration-profiles-upsert.sql >> "$COMBINED_FILE"
echo "" >> "$COMBINED_FILE"
echo "-- Now running event participants migration" >> "$COMBINED_FILE"
echo "" >> "$COMBINED_FILE"
cat migration-event-participants-upsert.sql >> "$COMBINED_FILE"

echo -e "${YELLOW}Running migration...${NC}"

# Run the combined migration
psql "$LOCAL_DB_URL" < "$COMBINED_FILE" > "migration-log-${TIMESTAMP}.txt" 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Migration completed successfully!${NC}"
    echo "Log saved to: migration-log-${TIMESTAMP}.txt"
    
    # Show summary
    echo -e "\n${YELLOW}Migration Summary:${NC}"
    psql "$LOCAL_DB_URL" -c "SELECT COUNT(*) as total_profiles FROM public.profiles;"
    psql "$LOCAL_DB_URL" -c "SELECT COUNT(*) as total_participants FROM public.event_participants;"
    
    # Show recently modified profiles
    echo -e "\n${YELLOW}Recently modified profiles (last 5):${NC}"
    psql "$LOCAL_DB_URL" -c "SELECT id, email, full_name, social_name, created_at FROM public.profiles ORDER BY created_at DESC LIMIT 5;"
else
    echo -e "${RED}✗ Migration failed. Check migration-log-${TIMESTAMP}.txt for details${NC}"
    tail -20 "migration-log-${TIMESTAMP}.txt"
fi

# Clean up combined file
rm -f "$COMBINED_FILE"