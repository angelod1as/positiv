-- =============================================================================
-- MAILING MIGRATION - ROLLBACK TO BACKUP
-- =============================================================================
-- ⚠️  DANGER: This script will REPLACE all data in the following tables:
--             profiles, events, event_participants, newsletter_subscriptions,
--             event_demographics_history, event_newsletter_campaigns
--
-- This script restores the database state from backup tables created by
-- 01_create_backup.sql. Use this if migration needs to be reversed.
--
-- Note: All tables use UUIDs for primary keys, no sequence resets needed.
--
-- Prerequisites:
--   - All backup tables must exist
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
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = '_backup_newsletter_subscriptions') THEN
        RAISE EXCEPTION 'Backup table _backup_newsletter_subscriptions does not exist! Cannot rollback.';
    END IF;
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = '_backup_event_demographics_history') THEN
        RAISE EXCEPTION 'Backup table _backup_event_demographics_history does not exist! Cannot rollback.';
    END IF;
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = '_backup_event_newsletter_campaigns') THEN
        RAISE EXCEPTION 'Backup table _backup_event_newsletter_campaigns does not exist! Cannot rollback.';
    END IF;
    RAISE NOTICE '✓ Backup tables verified';
END $$;

BEGIN;

-- =============================================================================
-- STEP 1: Delete all existing data (children first due to foreign keys)
-- =============================================================================
-- Order matters! Delete tables that have foreign keys first.

-- event_participants references both profiles and events
DELETE FROM event_participants;

-- newsletter_subscriptions references profiles
DELETE FROM newsletter_subscriptions;

-- event_demographics_history references events
DELETE FROM event_demographics_history;

-- event_newsletter_campaigns references events
DELETE FROM event_newsletter_campaigns;

-- Now safe to delete parent tables
DELETE FROM profiles;
DELETE FROM events;

-- =============================================================================
-- STEP 2: Restore data (parents first, then children)
-- =============================================================================

-- Restore profiles (parent)
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

-- Restore events (parent)
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

-- Restore newsletter_subscriptions (child of profiles)
INSERT INTO newsletter_subscriptions (
    id, profile_id, consent_given, last_consent_given_at, subscribed_at,
    unsubscribed_at, subscription_source, listmonk_subscriber_id, sync_status,
    last_sync_attempt_at, created_at, updated_at, first_consent_given_at
)
SELECT
    id, profile_id, consent_given, last_consent_given_at, subscribed_at,
    unsubscribed_at, subscription_source, listmonk_subscriber_id, sync_status,
    last_sync_attempt_at, created_at, updated_at, first_consent_given_at
FROM _backup_newsletter_subscriptions;

-- Restore event_demographics_history (child of events)
INSERT INTO event_demographics_history (
    id, event_id, calculated_at, total, veteran_yes, veteran_no,
    gender_cis, gender_trans, gender_agender, gender_other_percentage, gender_other_values,
    orientation_straight, orientation_homo, orientation_bi_pan, orientation_ace_demi,
    orientation_other_percentage, orientation_other_values,
    age_average, age_min, age_max, created_at,
    race_color_white, race_color_yellow, race_color_indigenous,
    race_color_black, race_color_brown, race_color_other_percentage, race_color_other_values
)
SELECT
    id, event_id, calculated_at, total, veteran_yes, veteran_no,
    gender_cis, gender_trans, gender_agender, gender_other_percentage, gender_other_values,
    orientation_straight, orientation_homo, orientation_bi_pan, orientation_ace_demi,
    orientation_other_percentage, orientation_other_values,
    age_average, age_min, age_max, created_at,
    race_color_white, race_color_yellow, race_color_indigenous,
    race_color_black, race_color_brown, race_color_other_percentage, race_color_other_values
FROM _backup_event_demographics_history;

-- Restore event_newsletter_campaigns (child of events)
INSERT INTO event_newsletter_campaigns (
    id, event_id, campaign_is_created, campaign_creation_time, campaign_id,
    campaign_is_sent, campaign_sent_time, last_attempt, times_attempted,
    last_error, created_at, updated_at
)
SELECT
    id, event_id, campaign_is_created, campaign_creation_time, campaign_id,
    campaign_is_sent, campaign_sent_time, last_attempt, times_attempted,
    last_error, created_at, updated_at
FROM _backup_event_newsletter_campaigns;

-- Restore event_participants (child of both profiles and events)
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
    backup_newsletter INT;
    current_newsletter INT;
    backup_demographics INT;
    current_demographics INT;
    backup_campaigns INT;
    current_campaigns INT;
BEGIN
    SELECT COUNT(*) INTO backup_profiles FROM _backup_profiles;
    SELECT COUNT(*) INTO current_profiles FROM profiles;
    SELECT COUNT(*) INTO backup_events FROM _backup_events;
    SELECT COUNT(*) INTO current_events FROM events;
    SELECT COUNT(*) INTO backup_participants FROM _backup_event_participants;
    SELECT COUNT(*) INTO current_participants FROM event_participants;
    SELECT COUNT(*) INTO backup_newsletter FROM _backup_newsletter_subscriptions;
    SELECT COUNT(*) INTO current_newsletter FROM newsletter_subscriptions;
    SELECT COUNT(*) INTO backup_demographics FROM _backup_event_demographics_history;
    SELECT COUNT(*) INTO current_demographics FROM event_demographics_history;
    SELECT COUNT(*) INTO backup_campaigns FROM _backup_event_newsletter_campaigns;
    SELECT COUNT(*) INTO current_campaigns FROM event_newsletter_campaigns;

    IF backup_profiles != current_profiles THEN
        RAISE EXCEPTION 'Rollback verification failed: profiles count mismatch (backup=%, current=%)', backup_profiles, current_profiles;
    END IF;

    IF backup_events != current_events THEN
        RAISE EXCEPTION 'Rollback verification failed: events count mismatch (backup=%, current=%)', backup_events, current_events;
    END IF;

    IF backup_participants != current_participants THEN
        RAISE EXCEPTION 'Rollback verification failed: event_participants count mismatch (backup=%, current=%)', backup_participants, current_participants;
    END IF;

    IF backup_newsletter != current_newsletter THEN
        RAISE EXCEPTION 'Rollback verification failed: newsletter_subscriptions count mismatch (backup=%, current=%)', backup_newsletter, current_newsletter;
    END IF;

    IF backup_demographics != current_demographics THEN
        RAISE EXCEPTION 'Rollback verification failed: event_demographics_history count mismatch (backup=%, current=%)', backup_demographics, current_demographics;
    END IF;

    IF backup_campaigns != current_campaigns THEN
        RAISE EXCEPTION 'Rollback verification failed: event_newsletter_campaigns count mismatch (backup=%, current=%)', backup_campaigns, current_campaigns;
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '✓ Rollback verification passed';
    RAISE NOTICE '  profiles: % rows', current_profiles;
    RAISE NOTICE '  events: % rows', current_events;
    RAISE NOTICE '  event_participants: % rows', current_participants;
    RAISE NOTICE '  newsletter_subscriptions: % rows', current_newsletter;
    RAISE NOTICE '  event_demographics_history: % rows', current_demographics;
    RAISE NOTICE '  event_newsletter_campaigns: % rows', current_campaigns;
END $$;

COMMIT;

-- =============================================================================
-- SUMMARY
-- =============================================================================
SELECT
    'Rollback completed at ' || NOW()::TEXT AS status,
    (SELECT COUNT(*) FROM profiles) AS profiles,
    (SELECT COUNT(*) FROM events) AS events,
    (SELECT COUNT(*) FROM event_participants) AS participants,
    (SELECT COUNT(*) FROM newsletter_subscriptions) AS newsletter,
    (SELECT COUNT(*) FROM event_demographics_history) AS demographics,
    (SELECT COUNT(*) FROM event_newsletter_campaigns) AS campaigns;
