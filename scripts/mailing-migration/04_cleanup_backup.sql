-- =============================================================================
-- MAILING MIGRATION - CLEANUP BACKUP TABLES
-- =============================================================================
-- ⚠️  DANGER: This script PERMANENTLY DELETES the backup tables.
--             Only run this after migration has been verified successful.
--
-- Prerequisites:
--   - Migration must be complete and verified
--   - You should NOT need to rollback anymore
--
-- Usage:
--   psql "$LOCAL_DB_URL" -f scripts/mailing-migration/04_cleanup_backup.sql
-- =============================================================================

-- Show what will be deleted
SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE '_backup_%'
ORDER BY tablename;

-- Confirmation message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  WARNING: You are about to PERMANENTLY DELETE the backup tables.';
    RAISE NOTICE '    After this, rollback will NOT be possible.';
    RAISE NOTICE '';
    RAISE NOTICE '    To proceed, uncomment the DROP TABLE statements below and run again.';
    RAISE NOTICE '';
END $$;

-- =============================================================================
-- UNCOMMENT BELOW TO ACTUALLY DELETE (safety measure)
-- =============================================================================

-- BEGIN;

-- DROP TABLE IF EXISTS _backup_event_participants;
-- DROP TABLE IF EXISTS _backup_profiles;
-- DROP TABLE IF EXISTS _backup_events;

-- RAISE NOTICE '✓ Backup tables deleted';

-- COMMIT;

-- Verify deletion
-- SELECT
--     tablename
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename LIKE '_backup_%';
