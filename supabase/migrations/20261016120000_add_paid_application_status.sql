-- POS-608: add 'paid' application status so a confirmed payment can flip the
-- participant from 'sent_payment_data' to 'paid' automatically in the webhook.
ALTER TYPE public.application_status_enum
  ADD VALUE IF NOT EXISTS 'paid' AFTER 'sent_payment_data';
