-- Migration: Create payment_transactions table
-- Purpose: Store all payment records for event registrations
-- Related: POS-286 - Phase 1, Migration 1 of payment system

-- ============================================
-- TABLE CREATION
-- ============================================
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    -- Our Data (Relationships & Identifiers)
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_participant_id uuid NOT NULL REFERENCES public.event_participants(id) ON DELETE CASCADE,
    profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE RESTRICT,

    -- Asaas Payment Data (Store as received)
    asaas_payment_id text UNIQUE NOT NULL,
    asaas_customer_id text NOT NULL,
    asaas_payment_data jsonb NOT NULL,

    -- Denormalized for fast queries
    payment_method text NOT NULL CHECK (payment_method IN ('pix', 'credit_card', 'boleto')),
    amount numeric(10, 2) NOT NULL,
    installments integer,

    -- Dates (Our tracking)
    created_at timestamptz NOT NULL DEFAULT NOW(),
    confirmed_at timestamptz,
    failed_at timestamptz,
    refunded_at timestamptz,
    updated_at timestamptz NOT NULL DEFAULT NOW(),

    -- Status & Refund (Our state management)
    status text NOT NULL CHECK (status IN ('pending', 'confirmed', 'failed', 'refunded')),
    created_by uuid REFERENCES public.profiles(id),
    refund_reason text,

    -- Business rule: refund_reason is required when status is 'refunded'
    CONSTRAINT chk_refund_reason_required_when_refunded
        CHECK (status != 'refunded' OR refund_reason IS NOT NULL)
);

-- ============================================
-- INDEXES
-- ============================================

-- Primary lookups
CREATE INDEX IF NOT EXISTS idx_payment_transactions_participant
ON public.payment_transactions(event_participant_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_profile
ON public.payment_transactions(profile_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_event
ON public.payment_transactions(event_id);

-- Status filtering
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status
ON public.payment_transactions(status);

-- Chronological queries
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at
ON public.payment_transactions(created_at DESC);

-- JSONB queries (GIN index for payment data)
CREATE INDEX IF NOT EXISTS idx_payment_transactions_asaas_data
ON public.payment_transactions USING gin(asaas_payment_data);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payment_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE OR REPLACE TRIGGER update_payment_transactions_timestamp
BEFORE UPDATE ON public.payment_transactions
FOR EACH ROW
EXECUTE FUNCTION update_payment_transactions_updated_at();

-- ============================================
-- OWNERSHIP & PERMISSIONS
-- ============================================

ALTER TABLE public.payment_transactions OWNER TO postgres;

-- Enable RLS (defense-in-depth, consistent with all other tables)
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Service role only (server-side operations, bypasses RLS)
GRANT ALL ON TABLE public.payment_transactions TO service_role;
REVOKE ALL ON TABLE public.payment_transactions FROM anon, authenticated;

-- ============================================
-- COMMENTS (Documentation)
-- ============================================

COMMENT ON TABLE public.payment_transactions IS
'Stores all payment transaction records for event registrations.
Integrates with Asaas payment gateway for Brazilian payment processing.
Separates our business data from Asaas payment data for clarity and future-proofing.';

-- Our Data
COMMENT ON COLUMN public.payment_transactions.id IS
'Primary key UUID for the payment transaction.';

COMMENT ON COLUMN public.payment_transactions.event_participant_id IS
'Foreign key to the event participant who made this payment. CASCADE deletes when participant removed.';

COMMENT ON COLUMN public.payment_transactions.profile_id IS
'Foreign key to the user profile. Denormalized for fast user-level queries.';

COMMENT ON COLUMN public.payment_transactions.event_id IS
'Foreign key to the event. Denormalized for fast event-level aggregations.';

-- Asaas Data
COMMENT ON COLUMN public.payment_transactions.asaas_payment_id IS
'Asaas payment ID (e.g., pay_080225913252). Unique for idempotency and webhook lookups. Matches payment.id from Asaas API.';

COMMENT ON COLUMN public.payment_transactions.asaas_customer_id IS
'Asaas customer ID (e.g., cus_G7Dvo4iphUNk). Used for API operations. Matches payment.customer from Asaas.';

COMMENT ON COLUMN public.payment_transactions.asaas_payment_data IS
'Complete JSONB payment object from Asaas webhook. Source of truth for all Asaas data.
Contains: billingType, status, confirmedDate, creditCard details, discount, fine, interest, invoiceUrl, etc.
Future-proof: automatically includes new fields when Asaas updates their API.';

COMMENT ON COLUMN public.payment_transactions.payment_method IS
'Payment method used: pix, credit_card, or boleto. Denormalized from asaas_payment_data.billingType for fast queries.';

COMMENT ON COLUMN public.payment_transactions.amount IS
'Payment amount in BRL (e.g., 220.00 for Pix, 227.00 for credit card). Denormalized from asaas_payment_data.value.';

COMMENT ON COLUMN public.payment_transactions.installments IS
'Number of credit card installments. NULL for Pix/boleto. Denormalized from asaas_payment_data.installmentCount.';

-- Dates
COMMENT ON COLUMN public.payment_transactions.created_at IS
'Timestamp when the payment transaction record was created in our database (webhook PAYMENT_RECEIVED).';

COMMENT ON COLUMN public.payment_transactions.confirmed_at IS
'Timestamp when we marked payment as confirmed (webhook PAYMENT_CONFIRMED).';

COMMENT ON COLUMN public.payment_transactions.failed_at IS
'Timestamp when payment failed (webhook PAYMENT_OVERDUE or other failure).';

COMMENT ON COLUMN public.payment_transactions.refunded_at IS
'Timestamp when refund was processed by admin.';

COMMENT ON COLUMN public.payment_transactions.updated_at IS
'Timestamp of last modification. Auto-updated by trigger.';

-- Status & Refund
COMMENT ON COLUMN public.payment_transactions.status IS
'Our payment status state machine: pending, confirmed, failed, or refunded.
May differ from asaas_payment_data.status as we track different lifecycle events.';

COMMENT ON COLUMN public.payment_transactions.created_by IS
'Admin user who generated the payment link. NULL for automated processes.';

COMMENT ON COLUMN public.payment_transactions.refund_reason IS
'Admin-provided reason for refund. Required when status=refunded.';

-- Index Comments
COMMENT ON INDEX idx_payment_transactions_participant IS
'Fast lookups of all payments for a specific participant.';

COMMENT ON INDEX idx_payment_transactions_profile IS
'Fast lookups of all payments made by a specific user.';

COMMENT ON INDEX idx_payment_transactions_event IS
'Fast event-level payment aggregations (total revenue, payment status counts).';

COMMENT ON INDEX idx_payment_transactions_status IS
'Filter payments by status (pending, confirmed, failed, refunded).';

COMMENT ON INDEX idx_payment_transactions_created_at IS
'Chronological queries ordered by creation time (DESC for recent first).';

COMMENT ON INDEX idx_payment_transactions_asaas_data IS
'GIN index for fast JSONB queries on Asaas payment data (e.g., creditCard brand, discount amount).';
