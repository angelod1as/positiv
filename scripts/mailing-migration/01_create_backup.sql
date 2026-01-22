-- =============================================================================
-- MAILING MIGRATION - PRE-MIGRATION BACKUP
-- =============================================================================
-- This script creates backup copies of tables that will be modified during
-- the mailing migration. Run this BEFORE any migration operations.
--
-- Tables backed up:
--   - profiles -> _backup_profiles
--   - events -> _backup_events
--   - event_participants -> _backup_event_participants
--   - newsletter_subscriptions -> _backup_newsletter_subscriptions (FK cascade from profiles)
--   - event_demographics_history -> _backup_event_demographics_history (FK cascade from events)
--   - event_newsletter_campaigns -> _backup_event_newsletter_campaigns (FK cascade from events)
--
-- Note: All tables use UUIDs for primary keys, no sequence resets needed.
--
-- ⚠️  SCHEMA WARNING: This script uses CREATE TABLE AS SELECT which copies
--                    all current columns. If the schema changes, the backup
--                    tables will reflect the schema at backup time.
--
-- Usage:
--   psql "$LOCAL_DB_URL" -f scripts/mailing-migration/01_create_backup.sql
-- =============================================================================

BEGIN;

-- Drop existing backup tables if they exist (from a previous failed attempt)
DROP TABLE IF EXISTS _backup_event_participants CASCADE;
DROP TABLE IF EXISTS _backup_newsletter_subscriptions CASCADE;
DROP TABLE IF EXISTS _backup_event_demographics_history CASCADE;
DROP TABLE IF EXISTS _backup_event_newsletter_campaigns CASCADE;
DROP TABLE IF EXISTS _backup_profiles CASCADE;
DROP TABLE IF EXISTS _backup_events CASCADE;

-- =============================================================================
-- BACKUP PROFILES
-- =============================================================================
CREATE TABLE _backup_profiles AS
SELECT * FROM profiles;

ALTER TABLE _backup_profiles
ADD COLUMN _backup_created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE _backup_profiles ADD PRIMARY KEY (id);

-- =============================================================================
-- BACKUP EVENTS
-- =============================================================================
CREATE TABLE _backup_events AS
SELECT * FROM events;

ALTER TABLE _backup_events
ADD COLUMN _backup_created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE _backup_events ADD PRIMARY KEY (id);

-- =============================================================================
-- BACKUP EVENT_PARTICIPANTS
-- =============================================================================
CREATE TABLE _backup_event_participants AS
SELECT * FROM event_participants;

ALTER TABLE _backup_event_participants
ADD COLUMN _backup_created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE _backup_event_participants ADD PRIMARY KEY (id);

-- =============================================================================
-- BACKUP NEWSLETTER_SUBSCRIPTIONS (cascades from profiles)
-- =============================================================================
CREATE TABLE _backup_newsletter_subscriptions AS
SELECT * FROM newsletter_subscriptions;

ALTER TABLE _backup_newsletter_subscriptions
ADD COLUMN _backup_created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE _backup_newsletter_subscriptions ADD PRIMARY KEY (id);

-- =============================================================================
-- BACKUP EVENT_DEMOGRAPHICS_HISTORY (cascades from events)
-- =============================================================================
CREATE TABLE _backup_event_demographics_history AS
SELECT * FROM event_demographics_history;

ALTER TABLE _backup_event_demographics_history
ADD COLUMN _backup_created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE _backup_event_demographics_history ADD PRIMARY KEY (id);

-- =============================================================================
-- BACKUP EVENT_NEWSLETTER_CAMPAIGNS (cascades from events)
-- =============================================================================
CREATE TABLE _backup_event_newsletter_campaigns AS
SELECT * FROM event_newsletter_campaigns;

ALTER TABLE _backup_event_newsletter_campaigns
ADD COLUMN _backup_created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE _backup_event_newsletter_campaigns ADD PRIMARY KEY (id);

-- =============================================================================
-- VERIFICATION
-- =============================================================================
DO $$
DECLARE
    orig_profiles INT;
    backup_profiles INT;
    orig_events INT;
    backup_events INT;
    orig_participants INT;
    backup_participants INT;
    orig_newsletter INT;
    backup_newsletter INT;
    orig_demographics INT;
    backup_demographics INT;
    orig_campaigns INT;
    backup_campaigns INT;
BEGIN
    SELECT COUNT(*) INTO orig_profiles FROM profiles;
    SELECT COUNT(*) INTO backup_profiles FROM _backup_profiles;
    SELECT COUNT(*) INTO orig_events FROM events;
    SELECT COUNT(*) INTO backup_events FROM _backup_events;
    SELECT COUNT(*) INTO orig_participants FROM event_participants;
    SELECT COUNT(*) INTO backup_participants FROM _backup_event_participants;
    SELECT COUNT(*) INTO orig_newsletter FROM newsletter_subscriptions;
    SELECT COUNT(*) INTO backup_newsletter FROM _backup_newsletter_subscriptions;
    SELECT COUNT(*) INTO orig_demographics FROM event_demographics_history;
    SELECT COUNT(*) INTO backup_demographics FROM _backup_event_demographics_history;
    SELECT COUNT(*) INTO orig_campaigns FROM event_newsletter_campaigns;
    SELECT COUNT(*) INTO backup_campaigns FROM _backup_event_newsletter_campaigns;

    IF orig_profiles != backup_profiles THEN
        RAISE EXCEPTION 'Profiles count mismatch: original=%, backup=%', orig_profiles, backup_profiles;
    END IF;

    IF orig_events != backup_events THEN
        RAISE EXCEPTION 'Events count mismatch: original=%, backup=%', orig_events, backup_events;
    END IF;

    IF orig_participants != backup_participants THEN
        RAISE EXCEPTION 'Event participants count mismatch: original=%, backup=%', orig_participants, backup_participants;
    END IF;

    IF orig_newsletter != backup_newsletter THEN
        RAISE EXCEPTION 'Newsletter subscriptions count mismatch: original=%, backup=%', orig_newsletter, backup_newsletter;
    END IF;

    IF orig_demographics != backup_demographics THEN
        RAISE EXCEPTION 'Event demographics history count mismatch: original=%, backup=%', orig_demographics, backup_demographics;
    END IF;

    IF orig_campaigns != backup_campaigns THEN
        RAISE EXCEPTION 'Event newsletter campaigns count mismatch: original=%, backup=%', orig_campaigns, backup_campaigns;
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '✓ Backup verification passed';
    RAISE NOTICE '  profiles: % rows', orig_profiles;
    RAISE NOTICE '  events: % rows', orig_events;
    RAISE NOTICE '  event_participants: % rows', orig_participants;
    RAISE NOTICE '  newsletter_subscriptions: % rows', orig_newsletter;
    RAISE NOTICE '  event_demographics_history: % rows', orig_demographics;
    RAISE NOTICE '  event_newsletter_campaigns: % rows', orig_campaigns;
END $$;

COMMIT;

-- =============================================================================
-- SUMMARY
-- =============================================================================
SELECT
    'Backup created at ' || NOW()::TEXT AS status,
    (SELECT COUNT(*) FROM _backup_profiles) AS profiles,
    (SELECT COUNT(*) FROM _backup_events) AS events,
    (SELECT COUNT(*) FROM _backup_event_participants) AS participants,
    (SELECT COUNT(*) FROM _backup_newsletter_subscriptions) AS newsletter,
    (SELECT COUNT(*) FROM _backup_event_demographics_history) AS demographics,
    (SELECT COUNT(*) FROM _backup_event_newsletter_campaigns) AS campaigns;
