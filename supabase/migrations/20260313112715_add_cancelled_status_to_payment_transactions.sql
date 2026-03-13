-- Migration: Add 'cancelled' to payment_transactions status CHECK constraint
-- Purpose: Allow marking sibling payment transactions as cancelled when one is confirmed
-- Related: POS-298 - Asaas webhook handler

ALTER TABLE public.payment_transactions
  DROP CONSTRAINT IF EXISTS payment_transactions_status_check;

ALTER TABLE public.payment_transactions
  ADD CONSTRAINT payment_transactions_status_check
  CHECK (status IN ('pending', 'confirmed', 'failed', 'refunded', 'cancelled'));
