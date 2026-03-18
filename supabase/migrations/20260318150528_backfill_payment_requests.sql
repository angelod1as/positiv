-- Backfill payment_requests from historical event_participants data
-- Step 1: Participants with has_paid = true (no existing payment_request)
INSERT INTO payment_requests (
  event_participant_id,
  amount,
  status,
  payment_mode,
  paid_at,
  expires_at
)
SELECT
  ep.id,
  COALESCE(ep.payment, 0),
  'paid'::payment_request_status,
  'manual',
  ep.updated_at,
  ep.updated_at + interval '2 days'
FROM event_participants ep
WHERE ep.has_paid = true
  AND NOT EXISTS (
    SELECT 1 FROM payment_requests pr
    WHERE pr.event_participant_id = ep.id
  );

-- Step 2: Participants with payment > 0 but has_paid = false (no existing payment_request)
INSERT INTO payment_requests (
  event_participant_id,
  amount,
  status,
  payment_mode,
  expires_at
)
SELECT
  ep.id,
  ep.payment,
  'pending'::payment_request_status,
  'manual',
  now() + interval '2 days'
FROM event_participants ep
WHERE ep.payment > 0
  AND ep.has_paid = false
  AND NOT EXISTS (
    SELECT 1 FROM payment_requests pr
    WHERE pr.event_participant_id = ep.id
  );
