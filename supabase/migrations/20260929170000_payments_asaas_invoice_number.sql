-- The charge's number in the Asaas dashboard. Refunds of Asaas payments are
-- done there by hand now, and the admin reaches the charge through
-- /payment/show/{invoiceNumber} -- the numeric one, not the pay_... id. For a
-- card plan it is the first charge's.

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS asaas_invoice_number text;

COMMENT ON COLUMN public.payments.asaas_invoice_number IS
'invoiceNumber of the Asaas charge (the first one, for a card plan), which
links the admin to the charge in the Asaas dashboard.';
