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
--
-- Usage:
--   psql "$LOCAL_DB_URL" -f scripts/mailing-migration/01_create_backup.sql
-- =============================================================================

BEGIN;

-- Drop existing backup tables if they exist (from a previous failed attempt)
DROP TABLE IF EXISTS _backup_event_participants CASCADE;
DROP TABLE IF EXISTS _backup_profiles CASCADE;
DROP TABLE IF EXISTS _backup_events CASCADE;

-- =============================================================================
-- BACKUP PROFILES
-- =============================================================================
CREATE TABLE _backup_profiles AS
SELECT * FROM profiles;

-- Add metadata columns to track backup
ALTER TABLE _backup_profiles
ADD COLUMN _backup_created_at TIMESTAMPTZ DEFAULT NOW();

-- Add primary key for reference integrity checks
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
BEGIN
    SELECT COUNT(*) INTO orig_profiles FROM profiles;
    SELECT COUNT(*) INTO backup_profiles FROM _backup_profiles;
    SELECT COUNT(*) INTO orig_events FROM events;
    SELECT COUNT(*) INTO backup_events FROM _backup_events;
    SELECT COUNT(*) INTO orig_participants FROM event_participants;
    SELECT COUNT(*) INTO backup_participants FROM _backup_event_participants;

    IF orig_profiles != backup_profiles THEN
        RAISE EXCEPTION 'Profiles count mismatch: original=%, backup=%', orig_profiles, backup_profiles;
    END IF;

    IF orig_events != backup_events THEN
        RAISE EXCEPTION 'Events count mismatch: original=%, backup=%', orig_events, backup_events;
    END IF;

    IF orig_participants != backup_participants THEN
        RAISE EXCEPTION 'Event participants count mismatch: original=%, backup=%', orig_participants, backup_participants;
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '✓ Backup verification passed';
    RAISE NOTICE '  profiles: % rows', orig_profiles;
    RAISE NOTICE '  events: % rows', orig_events;
    RAISE NOTICE '  event_participants: % rows', orig_participants;
END $$;

COMMIT;

-- =============================================================================
-- SUMMARY
-- =============================================================================
SELECT
    'Backup created at ' || NOW()::TEXT AS status,
    (SELECT COUNT(*) FROM _backup_profiles) AS profiles_backed_up,
    (SELECT COUNT(*) FROM _backup_events) AS events_backed_up,
    (SELECT COUNT(*) FROM _backup_event_participants) AS participants_backed_up;
