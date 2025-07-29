#!/bin/bash
# Simple rollback using the backup

# Configuration
BACKUP_DIR="${BACKUP_DIR:-.}"

echo "🔄 Rolling back migration..."

# List available backups
echo "Available backups:"
if [[ -d "$BACKUP_DIR" ]]; then
  ls -la "$BACKUP_DIR"/backup-*.dump 2>/dev/null || echo "No backup files found in $BACKUP_DIR"
else
  ls -la backup-*.dump 2>/dev/null || echo "No backup files found"
fi

echo ""
echo "Enter backup filename to restore:"
read -r backup_file

# Check if backup file exists (handle both relative and absolute paths)
if [[ -f "$backup_file" ]]; then
  # Absolute or relative path provided
  backup_path="$backup_file"
elif [[ -f "$BACKUP_DIR/$backup_file" ]]; then
  # File exists in backup directory
  backup_path="$BACKUP_DIR/$backup_file"
else
  echo "❌ Backup file not found" >&2
  exit 1
fi

# Skip actual restore if in test mode
if [[ "${SKIP_DB_RESTORE:-0}" == "1" ]]; then
  echo "Test mode: Skipping database restore"
  echo "✅ Rollback complete"
  exit 0
fi

# Restore the backup
echo "Restoring from: $backup_path"
pg_restore --clean --if-exists -d "${DATABASE_URL}" "$backup_path"
echo "✅ Rollback complete"