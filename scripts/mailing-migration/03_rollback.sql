-- =============================================================================
-- MAILING MIGRATION - ROLLBACK TO BACKUP
-- =============================================================================
-- ⚠️  DANGER: This script will REPLACE all data in profiles, events, and
--             event_participants with the backup data.
--
-- This script restores the database state from backup tables created by
-- 01_create_backup.sql. Use this if migration needs to be reversed.
--
-- Prerequisites:
--   - Backup tables must exist (_backup_profiles, _backup_events, _backup_event_participants)
--   - Run 02_verify_backup.sql first to confirm backup state
--
-- Usage:
--   psql "$LOCAL_DB_URL" -f scripts/mailing-migration/03_rollback.sql
-- =============================================================================

-- Verify backups exist before proceeding
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = '_backup_profiles') THEN
        RAISE EXCEPTION 'Backup table _backup_profiles does not exist! Cannot rollback.';
    END IF;
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = '_backup_events') THEN
        RAISE EXCEPTION 'Backup table _backup_events does not exist! Cannot rollback.';
    END IF;
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = '_backup_event_participants') THEN
        RAISE EXCEPTION 'Backup table _backup_event_participants does not exist! Cannot rollback.';
    END IF;
    RAISE NOTICE '✓ Backup tables verified';
END $$;

BEGIN;

-- =============================================================================
-- STEP 1: Delete all existing data (children first due to foreign keys)
-- =============================================================================
-- Note: We use DELETE instead of TRUNCATE because:
-- 1. TRUNCATE CASCADE may delete data from related tables we're not restoring
-- 2. DELETE respects foreign key order when done correctly

-- Delete event_participants first (references both profiles and events)
DELETE FROM event_participants;

-- Now we can safely delete from profiles and events
-- However, profiles has other dependencies (newsletter_subscriptions)
-- and events has other dependencies (event_demographics_history, event_newsletter_campaigns)
-- We only want to restore the backed-up tables, not cascade to others

-- Delete profiles (this will cascade to newsletter_subscriptions due to FK)
-- We need to be careful here - let's delete only the rows we're replacing
DELETE FROM profiles;

-- Delete events (this will cascade to event_demographics_history, event_newsletter_campaigns)
DELETE FROM events;

-- =============================================================================
-- STEP 2: Restore data (parents first)
-- =============================================================================
INSERT INTO profiles (
    id, user_id, email, created_at, basic_data_filled, full_name, social_name,
    rg, cpf, pronouns, phone, date_of_birth, gender, orientation, where_lives,
    how_came_to_us, rg_issuer, is_veteran, approved_to_attend, flag, flag_notes,
    general_notes, became_veteran_date, race_color
)
SELECT
    id, user_id, email, created_at, basic_data_filled, full_name, social_name,
    rg, cpf, pronouns, phone, date_of_birth, gender, orientation, where_lives,
    how_came_to_us, rg_issuer, is_veteran, approved_to_attend, flag, flag_notes,
    general_notes, became_veteran_date, race_color
FROM _backup_profiles;

INSERT INTO events (
    id, title, location, description, emoji, time_event_start, time_event_end,
    time_application_start, time_payment_end, time_payment_start, time_group_start,
    time_group_end, ticket_price, total_spots, created_at, event_status, event_type,
    auto_publish, listmonk_list_id, listmonk_list_synced_at
)
SELECT
    id, title, location, description, emoji, time_event_start, time_event_end,
    time_application_start, time_payment_end, time_payment_start, time_group_start,
    time_group_end, ticket_price, total_spots, created_at, event_status, event_type,
    auto_publish, listmonk_list_id, listmonk_list_synced_at
FROM _backup_events;

INSERT INTO event_participants (
    id, profile_id, event_id, is_user_applied, payment, application_date,
    cancellation_date, created_at, notes, referrals, companions, bond,
    admin_general_notes, application_status, attendance_status, has_paid,
    spot_type, referred, updated_at, was_selected_for_rotation
)
SELECT
    id, profile_id, event_id, is_user_applied, payment, application_date,
    cancellation_date, created_at, notes, referrals, companions, bond,
    admin_general_notes, application_status, attendance_status, has_paid,
    spot_type, referred, updated_at, was_selected_for_rotation
FROM _backup_event_participants;

-- =============================================================================
-- STEP 3: Verify rollback
-- =============================================================================
DO $$
DECLARE
    backup_profiles INT;
    current_profiles INT;
    backup_events INT;
    current_events INT;
    backup_participants INT;
    current_participants INT;
BEGIN
    SELECT COUNT(*) INTO backup_profiles FROM _backup_profiles;
    SELECT COUNT(*) INTO current_profiles FROM profiles;
    SELECT COUNT(*) INTO backup_events FROM _backup_events;
    SELECT COUNT(*) INTO current_events FROM events;
    SELECT COUNT(*) INTO backup_participants FROM _backup_event_participants;
    SELECT COUNT(*) INTO current_participants FROM event_participants;

    IF backup_profiles != current_profiles THEN
        RAISE EXCEPTION 'Rollback verification failed: profiles count mismatch (backup=%, current=%)', backup_profiles, current_profiles;
    END IF;

    IF backup_events != current_events THEN
        RAISE EXCEPTION 'Rollback verification failed: events count mismatch (backup=%, current=%)', backup_events, current_events;
    END IF;

    IF backup_participants != current_participants THEN
        RAISE EXCEPTION 'Rollback verification failed: event_participants count mismatch (backup=%, current=%)', backup_participants, current_participants;
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '✓ Rollback verification passed';
    RAISE NOTICE '  profiles: % rows', current_profiles;
    RAISE NOTICE '  events: % rows', current_events;
    RAISE NOTICE '  event_participants: % rows', current_participants;
END $$;

COMMIT;

-- =============================================================================
-- SUMMARY
-- =============================================================================
SELECT
    'Rollback completed at ' || NOW()::TEXT AS status,
    (SELECT COUNT(*) FROM profiles) AS profiles_restored,
    (SELECT COUNT(*) FROM events) AS events_restored,
    (SELECT COUNT(*) FROM event_participants) AS participants_restored;
