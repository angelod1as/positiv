-- =============================================================================
-- MAILING MIGRATION - VERIFY BACKUP EXISTS
-- =============================================================================
-- Run this script to verify backup tables exist and contain data.
-- Use this before running any migration operations.
--
-- Usage:
--   psql "$LOCAL_DB_URL" -f scripts/mailing-migration/02_verify_backup.sql
-- =============================================================================

DO $$
DECLARE
    backup_profiles INT;
    backup_events INT;
    backup_participants INT;
    backup_time TIMESTAMPTZ;
BEGIN
    -- Check backup tables exist
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = '_backup_profiles') THEN
        RAISE EXCEPTION 'Backup table _backup_profiles does not exist! Run 01_create_backup.sql first.';
    END IF;

    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = '_backup_events') THEN
        RAISE EXCEPTION 'Backup table _backup_events does not exist! Run 01_create_backup.sql first.';
    END IF;

    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = '_backup_event_participants') THEN
        RAISE EXCEPTION 'Backup table _backup_event_participants does not exist! Run 01_create_backup.sql first.';
    END IF;

    -- Get counts
    SELECT COUNT(*) INTO backup_profiles FROM _backup_profiles;
    SELECT COUNT(*) INTO backup_events FROM _backup_events;
    SELECT COUNT(*) INTO backup_participants FROM _backup_event_participants;

    -- Get backup time
    SELECT _backup_created_at INTO backup_time FROM _backup_profiles LIMIT 1;

    -- Verify backups have data
    IF backup_profiles = 0 THEN
        RAISE EXCEPTION 'Backup table _backup_profiles is empty!';
    END IF;

    IF backup_events = 0 THEN
        RAISE EXCEPTION 'Backup table _backup_events is empty!';
    END IF;

    -- Note: event_participants could legitimately be 0, but unlikely
    IF backup_participants = 0 THEN
        RAISE WARNING 'Backup table _backup_event_participants is empty - this may be intentional';
    END IF;

    RAISE NOTICE '✓ Backup verification passed';
    RAISE NOTICE '  Backup created at: %', backup_time;
    RAISE NOTICE '  _backup_profiles: % rows', backup_profiles;
    RAISE NOTICE '  _backup_events: % rows', backup_events;
    RAISE NOTICE '  _backup_event_participants: % rows', backup_participants;
END $$;

-- Show comparison with current tables
SELECT
    'profiles' AS table_name,
    (SELECT COUNT(*) FROM _backup_profiles) AS backup_rows,
    (SELECT COUNT(*) FROM profiles) AS current_rows,
    (SELECT COUNT(*) FROM profiles) - (SELECT COUNT(*) FROM _backup_profiles) AS difference
UNION ALL
SELECT
    'events',
    (SELECT COUNT(*) FROM _backup_events),
    (SELECT COUNT(*) FROM events),
    (SELECT COUNT(*) FROM events) - (SELECT COUNT(*) FROM _backup_events)
UNION ALL
SELECT
    'event_participants',
    (SELECT COUNT(*) FROM _backup_event_participants),
    (SELECT COUNT(*) FROM event_participants),
    (SELECT COUNT(*) FROM event_participants) - (SELECT COUNT(*) FROM _backup_event_participants);
