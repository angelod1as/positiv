CREATE TYPE public.spot_type AS ENUM ('regular', 'social', 'staff');

ALTER TABLE public.event_participants
ADD COLUMN spot_type public.spot_type NOT NULL DEFAULT 'regular';

UPDATE public.event_participants
SET
    spot_type = (
        CASE
            WHEN is_staff_spot THEN 'staff'::public.spot_type
            WHEN is_social_spot THEN 'social'::public.spot_type
            ELSE 'regular'::public.spot_type
        END
    );

ALTER TABLE public.event_participants
DROP COLUMN is_social_spot,
DROP COLUMN is_staff_spot;
