-- POS-448: rename will-not-go to withdrew
-- ALTER TYPE ... RENAME VALUE migrates existing data automatically (no UPDATE needed)
ALTER TYPE public.attendance_status_enum RENAME VALUE 'will-not-go' TO 'withdrew';

-- POS-448: add not-selected (candidate who applied but was not selected for the event)
ALTER TYPE public.attendance_status_enum ADD VALUE 'not-selected';

-- POS-447: add no_response (candidate who was contacted but did not respond)
ALTER TYPE public.application_status_enum ADD VALUE 'no_response';
