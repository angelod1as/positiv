-- Rollback payment system: remove payment_transactions table and payment_link fields
-- These were added by PRs #529, #544, and #556 as part of the Asaas payment integration
-- The payment system is being rolled back due to a fundamental design flaw

DROP TABLE IF EXISTS payment_transactions;

ALTER TABLE event_participants
  DROP COLUMN IF EXISTS payment_transaction_id,
  DROP COLUMN IF EXISTS payment_link_token,
  DROP COLUMN IF EXISTS payment_link_generated_at,
  DROP COLUMN IF EXISTS payment_link_expires_at;
