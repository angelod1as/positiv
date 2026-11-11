-- WEB-47: re-applying cleared the cancellation reason but kept the date, so an
-- active registration could carry the date of a cancellation it has undone.
-- The application now clears both; this clears the dates already left behind.
UPDATE public.event_participants
   SET cancellation_date = NULL
 WHERE is_user_applied
   AND cancellation_date IS NOT NULL;
