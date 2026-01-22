-- =============================================================================
-- MAILING MIGRATION - CLEANUP BACKUP TABLES
-- =============================================================================
-- ⚠️  DANGER: This script PERMANENTLY DELETES the backup tables.
--             Only run this after migration has been verified successful.
--
-- Backup tables that will be deleted:
--   - _backup_profiles
--   - _backup_events
--   - _backup_event_participants
--   - _backup_newsletter_subscriptions
--   - _backup_event_demographics_history
--   - _backup_event_newsletter_campaigns
--
-- Prerequisites:
--   - Migration must be complete and verified
--   - You should NOT need to rollback anymore
--   - Once deleted, rollback is no longer possible
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
-- DROP TABLE IF EXISTS _backup_newsletter_subscriptions;
-- DROP TABLE IF EXISTS _backup_event_demographics_history;
-- DROP TABLE IF EXISTS _backup_event_newsletter_campaigns;
-- DROP TABLE IF EXISTS _backup_profiles;
-- DROP TABLE IF EXISTS _backup_events;

-- DO $$
-- BEGIN
--     RAISE NOTICE '✓ Backup tables deleted';
-- END $$;

-- COMMIT;

-- Verify deletion
-- SELECT
--     tablename
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename LIKE '_backup_%';
