-- WEB-47: the trigger function of payment_transactions, a table dropped in
-- 20260315000001. It exists only in production, created outside migrations.
DROP FUNCTION IF EXISTS public.update_payment_transactions_updated_at();
