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
    backup_newsletter INT;
    backup_demographics INT;
    backup_campaigns INT;
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

    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = '_backup_newsletter_subscriptions') THEN
        RAISE EXCEPTION 'Backup table _backup_newsletter_subscriptions does not exist! Run 01_create_backup.sql first.';
    END IF;

    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = '_backup_event_demographics_history') THEN
        RAISE EXCEPTION 'Backup table _backup_event_demographics_history does not exist! Run 01_create_backup.sql first.';
    END IF;

    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = '_backup_event_newsletter_campaigns') THEN
        RAISE EXCEPTION 'Backup table _backup_event_newsletter_campaigns does not exist! Run 01_create_backup.sql first.';
    END IF;

    -- Get counts
    SELECT COUNT(*) INTO backup_profiles FROM _backup_profiles;
    SELECT COUNT(*) INTO backup_events FROM _backup_events;
    SELECT COUNT(*) INTO backup_participants FROM _backup_event_participants;
    SELECT COUNT(*) INTO backup_newsletter FROM _backup_newsletter_subscriptions;
    SELECT COUNT(*) INTO backup_demographics FROM _backup_event_demographics_history;
    SELECT COUNT(*) INTO backup_campaigns FROM _backup_event_newsletter_campaigns;

    -- Get backup time
    SELECT _backup_created_at INTO backup_time FROM _backup_profiles LIMIT 1;

    -- Verify critical backups have data
    IF backup_profiles = 0 THEN
        RAISE EXCEPTION 'Backup table _backup_profiles is empty!';
    END IF;

    IF backup_events = 0 THEN
        RAISE EXCEPTION 'Backup table _backup_events is empty!';
    END IF;

    -- These tables could legitimately be empty
    IF backup_participants = 0 THEN
        RAISE WARNING 'Backup table _backup_event_participants is empty - this may be intentional';
    END IF;

    RAISE NOTICE '✓ Backup verification passed';
    RAISE NOTICE '  Backup created at: %', backup_time;
    RAISE NOTICE '  _backup_profiles: % rows', backup_profiles;
    RAISE NOTICE '  _backup_events: % rows', backup_events;
    RAISE NOTICE '  _backup_event_participants: % rows', backup_participants;
    RAISE NOTICE '  _backup_newsletter_subscriptions: % rows', backup_newsletter;
    RAISE NOTICE '  _backup_event_demographics_history: % rows', backup_demographics;
    RAISE NOTICE '  _backup_event_newsletter_campaigns: % rows', backup_campaigns;
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
    (SELECT COUNT(*) FROM event_participants) - (SELECT COUNT(*) FROM _backup_event_participants)
UNION ALL
SELECT
    'newsletter_subscriptions',
    (SELECT COUNT(*) FROM _backup_newsletter_subscriptions),
    (SELECT COUNT(*) FROM newsletter_subscriptions),
    (SELECT COUNT(*) FROM newsletter_subscriptions) - (SELECT COUNT(*) FROM _backup_newsletter_subscriptions)
UNION ALL
SELECT
    'event_demographics_history',
    (SELECT COUNT(*) FROM _backup_event_demographics_history),
    (SELECT COUNT(*) FROM event_demographics_history),
    (SELECT COUNT(*) FROM event_demographics_history) - (SELECT COUNT(*) FROM _backup_event_demographics_history)
UNION ALL
SELECT
    'event_newsletter_campaigns',
    (SELECT COUNT(*) FROM _backup_event_newsletter_campaigns),
    (SELECT COUNT(*) FROM event_newsletter_campaigns),
    (SELECT COUNT(*) FROM event_newsletter_campaigns) - (SELECT COUNT(*) FROM _backup_event_newsletter_campaigns);
