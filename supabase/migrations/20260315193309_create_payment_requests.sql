DO $$ BEGIN
  CREATE TYPE "public"."payment_request_status" AS ENUM (
    'pending', 'awaiting_payment', 'paid', 'expired',
    'refunded', 'partially_refunded', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "public"."payment_requests" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "event_participant_id" uuid NOT NULL REFERENCES "public"."event_participants" ("id") ON DELETE CASCADE,
    "asaas_customer_id" text,
    "asaas_payment_id" text,
    "payment_mode" text NOT NULL DEFAULT 'manual',
    "payment_method" text,
    "installment_count" integer DEFAULT 1,
    "amount" numeric(10, 2) NOT NULL,
    "status" "public"."payment_request_status" DEFAULT 'pending' NOT NULL,
    "invoice_url" text,
    "expires_at" timestamptz NOT NULL,
    "paid_at" timestamptz,
    "refund_amount" numeric(10, 2) DEFAULT 0,
    "refunded_at" timestamptz,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE "public"."payment_requests" ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_payment_requests_event_participant_id ON payment_requests (event_participant_id);
CREATE INDEX idx_payment_requests_asaas_payment_id ON payment_requests (asaas_payment_id);
