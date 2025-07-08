-- Add "Approved" column to profiles
ALTER TABLE profiles
ADD COLUMN approved boolean DEFAULT false NOT NULL;

UPDATE public.profiles AS p
SET
    approved = true
FROM
    public.event_participants AS ep
WHERE
    p.id = ep.profile_id
    AND ep.application_status IN ('sent_payment_data', 'sent_rules', 'finalised');
