-- Add indexes for advanced segmentation performance

-- Index on attendance_status for filtering attended events
CREATE INDEX IF NOT EXISTS idx_event_participants_attendance_status 
ON event_participants(attendance_status);

-- Index on application_date for date-based filtering
CREATE INDEX IF NOT EXISTS idx_event_participants_application_date 
ON event_participants(application_date);

-- Composite index for profile attendance queries
CREATE INDEX IF NOT EXISTS idx_event_participants_profile_attendance 
ON event_participants(profile_id, attendance_status, application_date);

-- Index on event_id for event-specific filtering
CREATE INDEX IF NOT EXISTS idx_event_participants_event_id 
ON event_participants(event_id);

-- Index on events.time_event_start for date range queries
CREATE INDEX IF NOT EXISTS idx_events_time_event_start 
ON events(time_event_start);

-- Index on profiles for marketing email filtering
CREATE INDEX IF NOT EXISTS idx_profiles_marketing_email 
ON profiles(allow_marketing_email, email) 
WHERE allow_marketing_email = true AND email IS NOT NULL;

-- Index on profiles.created_at for new registration filtering
CREATE INDEX IF NOT EXISTS idx_profiles_created_at 
ON profiles(created_at);

-- Index on profiles.is_veteran for veteran/newbie filtering
CREATE INDEX IF NOT EXISTS idx_profiles_is_veteran 
ON profiles(is_veteran) 
WHERE allow_marketing_email = true;