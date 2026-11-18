-- WEB-56: false has meant a cancelled application for a long time; nobody
-- writes false to mark an admin-added person, and admins now add people with
-- true.

COMMENT ON COLUMN public.event_participants.is_user_applied IS
'True while the person holds a spot, whether they applied or an admin added them. False once the application is cancelled.';
