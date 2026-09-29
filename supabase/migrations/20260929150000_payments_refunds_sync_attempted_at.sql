-- When the refund sync last tried to read a payment from Asaas, whether or not
-- Asaas answered. refunds_synced_at only moves on success, and the sync job
-- picks the least recently read payments first: a payment Asaas never answers
-- about would stay first in line on every run, and twenty of them would fill
-- every batch. The job orders and throttles by this instead; the admin still
-- sees refunds_synced_at, the last read that worked.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS refunds_sync_attempted_at timestamptz;

COMMENT ON COLUMN public.payments.refunds_sync_attempted_at IS
'When the refund sync last tried to read this payment from Asaas, successful or not.';
