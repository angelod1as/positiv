#!/bin/bash

# Quick restore script for existing backups
# Use this when you already have backup files

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Restore Existing Backup to Local Database${NC}"
echo "=========================================="

# Local database URL
LOCAL_DB_URL="postgresql://postgres:postgres@localhost:54322/postgres"

# Find latest backup files
LATEST_BACKUP=$(ls -t ./backups/prod_backup_*.sql 2>/dev/null | head -1)
LATEST_AUTH_BACKUP=$(ls -t ./backups/prod_auth_backup_*.sql 2>/dev/null | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    echo -e "${RED}No backup files found in ./backups/${NC}"
    exit 1
fi

echo "Found backups:"
echo "  - Main: $LATEST_BACKUP"
[ -n "$LATEST_AUTH_BACKUP" ] && echo "  - Auth: $LATEST_AUTH_BACKUP"
echo

read -p "Use these backups? (y/n): " -n 1 -r USE_LATEST
echo
if [[ ! $USE_LATEST =~ ^[Yy]$ ]]; then
    # Let user specify files
    read -p "Enter path to main backup file: " LATEST_BACKUP
    read -p "Enter path to auth backup file (optional): " LATEST_AUTH_BACKUP
fi

# Check if local Supabase is running
supabase status > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Starting local Supabase..."
    supabase start
fi

echo -e "${YELLOW}This will replace your local database with production data.${NC}"
read -p "Continue? (y/n): " -n 1 -r CONFIRM
echo
if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
    echo "Restore cancelled."
    exit 0
fi

# Reset without seed
echo "Resetting local database (without seed data)..."
supabase db reset --no-seed

# Restore main backup
echo "Restoring production data..."
/opt/homebrew/opt/postgresql@15/bin/psql "$LOCAL_DB_URL" < "$LATEST_BACKUP"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Production data restored${NC}"
else
    echo -e "${RED}✗ Failed to restore production data${NC}"
    exit 1
fi

# Restore auth if available
if [ -n "$LATEST_AUTH_BACKUP" ] && [ -f "$LATEST_AUTH_BACKUP" ]; then
    read -p "Restore auth schema? (y/n): " -n 1 -r RESTORE_AUTH
    echo
    if [[ $RESTORE_AUTH =~ ^[Yy]$ ]]; then
        /opt/homebrew/opt/postgresql@15/bin/psql "$LOCAL_DB_URL" < "$LATEST_AUTH_BACKUP"
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Auth data restored${NC}"
        else
            echo -e "${YELLOW}⚠ Failed to restore auth data (this might be normal)${NC}"
        fi
    fi
fi

# Fix permissions
echo "Fixing database permissions..."
if [ -f "./fix-permissions.sql" ]; then
    /opt/homebrew/opt/postgresql@15/bin/psql "$LOCAL_DB_URL" -f "./fix-permissions.sql"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Permissions fixed${NC}"
    else
        echo -e "${RED}✗ Failed to fix permissions${NC}"
    fi
else
    echo -e "${YELLOW}⚠ fix-permissions.sql not found, skipping permissions fix${NC}"
fi

echo -e "${GREEN}✓ Restore complete!${NC}"
echo
echo "You can now run the migration:"
echo "  ./scripts/run-migration-local.sh"