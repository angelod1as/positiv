-- One application per person per event (WEB-46).
--
-- Applying used to be a read followed by an upsert by id, with nothing in the
-- schema to stop two concurrent submissions from writing two rows. This index
-- makes the second one a conflict, and gives applyToEvent a target for
-- INSERT ... ON CONFLICT (event_id, profile_id).
--
-- Rows with no profile (profile_id null) are not unique to each other, so the
-- participants left behind by a deleted profile are untouched. Production had
-- no duplicate (event_id, profile_id) pair when this was written.
CREATE UNIQUE INDEX IF NOT EXISTS event_participants_event_id_profile_id_key
  ON public.event_participants (event_id, profile_id);

COMMENT ON INDEX public.event_participants_event_id_profile_id_key IS
  'One application per profile per event; conflict target of applyToEvent.';
