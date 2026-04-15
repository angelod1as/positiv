DO $$ BEGIN
  CREATE TYPE "public"."payment_request_status" AS ENUM (
    'pending', 'awaiting_payment', 'paid', 'expired',
    'refunded', 'partially_refunded', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "public"."payment_requests" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    -- Note: ON DELETE CASCADE currently wipes payment audit trail when an
    -- event_participant is deleted (LGPD / Receita Federal risk). Tracked
    -- as a caveat in `docs/payment-system-architecture.md` §5.1; the fix
    -- requires a soft-delete policy decision before changing to RESTRICT.
    "event_participant_id" uuid NOT NULL REFERENCES "public"."event_participants" ("id") ON DELETE CASCADE,
    "asaas_customer_id" text,
    "asaas_payment_id" text,
    "payment_mode" text NOT NULL DEFAULT 'manual'
        CHECK ("payment_mode" IN ('automatic', 'manual')),
    "payment_method" text
        CHECK ("payment_method" IS NULL OR "payment_method" IN ('PIX', 'CREDIT_CARD')),
    -- NULL for manual payments where installments don't apply; set to a
    -- positive integer once a credit-card installment plan is chosen.
    "installment_count" integer
        CHECK ("installment_count" IS NULL OR "installment_count" > 0),
    "amount" numeric(10, 2) NOT NULL
        CHECK ("amount" > 0),
    "status" "public"."payment_request_status" DEFAULT 'pending' NOT NULL,
    "invoice_url" text,
    "expires_at" timestamptz NOT NULL,
    "paid_at" timestamptz,
    -- NULL = no refund attempted/recorded. A zero value here would be
    -- ambiguous (was it actually refunded for 0, or never refunded?).
    "refund_amount" numeric(10, 2),
    "refunded_at" timestamptz,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,

    -- Refund consistency: `refund_amount` and `refunded_at` are set together
    -- or both NULL. Prevents half-recorded refunds that would confuse
    -- accounting and admin UI.
    CONSTRAINT payment_requests_refund_consistency
        CHECK (("refund_amount" IS NULL) = ("refunded_at" IS NULL)),
    -- A refund can never exceed the original charge.
    CONSTRAINT payment_requests_refund_amount_bounded
        CHECK ("refund_amount" IS NULL OR "refund_amount" <= "amount")
);

ALTER TABLE "public"."payment_requests" ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_payment_requests_event_participant_id
    ON "public"."payment_requests" ("event_participant_id");

-- Partial index: `asaas_payment_id` is NULL for every manual payment row,
-- so indexing the whole column wastes space. The webhook handler only
-- ever looks up by a non-null value.
CREATE INDEX IF NOT EXISTS idx_payment_requests_asaas_payment_id
    ON "public"."payment_requests" ("asaas_payment_id")
    WHERE "asaas_payment_id" IS NOT NULL;

-- Admin queries filter by lifecycle status (e.g. "list all pending"). Plain
-- index over the enum — low cardinality but still beats a seq scan once
-- the table has more than a few hundred rows.
CREATE INDEX IF NOT EXISTS idx_payment_requests_status
    ON "public"."payment_requests" ("status");

-- Partial index for the expiration sweep cron: only rows that can still
-- transition to `expired` are relevant. Skips terminal-state rows,
-- keeping the index compact.
CREATE INDEX IF NOT EXISTS idx_payment_requests_expires_at_active
    ON "public"."payment_requests" ("expires_at")
    WHERE "status" IN ('pending', 'awaiting_payment');
