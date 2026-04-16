DO $$ BEGIN
  CREATE TYPE "public"."payment_request_status" AS ENUM (
    'pending', 'awaiting_payment', 'paid', 'expired',
    'refunded', 'partially_refunded', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."payment_mode" AS ENUM ('automatic', 'manual');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."payment_method" AS ENUM ('PIX', 'CREDIT_CARD');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "public"."payment_requests" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    -- ON DELETE RESTRICT preserves the payment audit trail (LGPD / Receita
    -- Federal): deleting an event_participant with associated payment
    -- history is blocked. Callers that need to remove a participant must
    -- first explicitly handle any payment records (soft-delete / archive),
    -- forcing the policy decision at the call site instead of silently
    -- cascading.
    "event_participant_id" uuid NOT NULL REFERENCES "public"."event_participants" ("id") ON DELETE RESTRICT,
    "asaas_customer_id" text,
    "asaas_payment_id" text,
    "payment_mode" "public"."payment_mode" NOT NULL DEFAULT 'manual',
    "payment_method" "public"."payment_method",
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
    -- A refund must be strictly positive and can never exceed the original
    -- charge. A zero refund would be meaningless and indicate a bug in the
    -- caller (the NULL column already encodes "no refund").
    CONSTRAINT payment_requests_refund_amount_bounded
        CHECK ("refund_amount" IS NULL OR ("refund_amount" > 0 AND "refund_amount" <= "amount")),
    -- Expiration must be in the future relative to creation. A stale
    -- deadline at insert time is almost always a bug in the calling
    -- code (e.g. timezone mishandling, off-by-one day).
    CONSTRAINT payment_requests_expires_after_created
        CHECK ("expires_at" > "created_at"),
    -- `paid_at` is populated iff the row is in a terminal post-payment
    -- state. Refunded / partially-refunded rows were necessarily paid
    -- first, so they also carry a `paid_at`. Pending, awaiting_payment,
    -- expired, and cancelled rows must leave it NULL — otherwise an
    -- application bug could stamp a paid timestamp on a never-paid row.
    CONSTRAINT payment_requests_paid_at_matches_status
        CHECK (
            ("status" IN ('paid', 'refunded', 'partially_refunded'))
            = ("paid_at" IS NOT NULL)
        ),
    -- Installments only exist on credit-card charges. PIX settles in a
    -- single transfer; manual payments have no gateway plan. The column
    -- comment documents the invariant; this constraint enforces it so a
    -- caller can't slip an installment count onto the wrong method.
    CONSTRAINT payment_requests_installment_count_only_for_credit_card
        CHECK ("installment_count" IS NULL OR "payment_method" = 'CREDIT_CARD'),
    -- A `partially_refunded` row must have returned strictly less than the
    -- original charge — a full refund belongs in the `refunded` state. The
    -- refund_amount_bounded constraint already guarantees `> 0 AND <=
    -- amount`; this narrows the upper bound to `<` for the partial case so
    -- the two statuses stay semantically distinct.
    CONSTRAINT payment_requests_partial_refund_amount_strict
        CHECK (
            "status" != 'partially_refunded'
            OR ("refund_amount" IS NOT NULL AND "refund_amount" < "amount")
        )
);

ALTER TABLE "public"."payment_requests" ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_payment_requests_event_participant_id
    ON "public"."payment_requests" ("event_participant_id");

-- Partial UNIQUE index: `asaas_payment_id` is NULL for every manual payment
-- row (so indexing the whole column would waste space), and it must be
-- unique when set — double webhook delivery or a duplicate payment-
-- creation bug should NEVER produce two rows pointing at the same Asaas
-- charge. Enforcing this at the DB closes a race condition the webhook
-- handler would otherwise have to detect explicitly. Cheap to add now;
-- expensive to retrofit after real data exists.
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_requests_asaas_payment_id
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
