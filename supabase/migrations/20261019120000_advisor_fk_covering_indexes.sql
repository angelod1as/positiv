-- POS-596: the production performance advisor flagged three foreign keys with
-- no covering index. Each lookup by the referencing column -- an ON DELETE
-- CASCADE or SET NULL as the parent profile is removed, and any join from the
-- parent -- otherwise scans the whole child table.
--
--   event_invites.profile_id  NOT NULL, ON DELETE CASCADE. The UNIQUE
--     (event_id, profile_id) index leads with event_id, so it does not cover
--     a profile_id lookup.
--   payments.created_by       ON DELETE SET NULL. Cheap insurance for the
--     set-null scan and for admin-scoped payment queries.
--   app_settings.updated_by   ON DELETE SET NULL. A tiny table, but indexed
--     for consistency so the advisor's foreign-key category is clean.
--
-- An index creates no object that PostgREST can reach, so it needs no grant.

CREATE INDEX IF NOT EXISTS event_invites_profile_id_idx
  ON public.event_invites (profile_id);

CREATE INDEX IF NOT EXISTS payments_created_by_idx
  ON public.payments (created_by);

CREATE INDEX IF NOT EXISTS app_settings_updated_by_idx
  ON public.app_settings (updated_by);
