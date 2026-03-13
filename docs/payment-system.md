# Payment System - Asaas Integration

> **Linear Project:** [Sistema de Pagamentos](https://linear.app/positiv/project/sistema-de-pagamentos-cc14e6a9417c)
> **Status:** In Progress (foundation complete, UI and webhook pending)

## Overview

Automated payment system for event registrations in the Positiv platform. Integrated with Asaas for Brazilian payment processing.

**Key Features:**
- Generate unique payment links per participant
- Dual payment options: Pix (R$ 220) and Credit Card (R$ 227)
- Credit card supports up to 6x installments
- WhatsApp integration with pre-filled messages
- Email notifications (link sent, success, failure)
- Webhook-based payment confirmation
- Admin refund capability
- Special handling for social/staff (free) spots

**Business Context:**
- Target: 8 events/year, ~45 attendees average
- Payment mix: 50% credit installments, 30% credit à vista, 20% Pix
- Strategy: Absorb Pix fees, pass credit fees to customers

---

## Why Asaas?

### Provider Comparison

| Provider | Pix Fee | Credit À Vista | Credit Installments | Notes |
|----------|---------|----------------|---------------------|-------|
| **Asaas** | R$ 1.89 | 2.89% | 3.12-3.44% | **Selected** |
| Vindi | R$ 0.99 | 2.29% | 9.99% | Higher installment fees |
| Pagar.me | R$ 0.99 | 2.39% | 9.99% (standard) | Promo pricing unreliable |
| Mercado Pago | R$ 0.99 | 4.99% | 13.99-19.99% | Highest fees |

### Annual Cost Analysis

Based on 360 annual transactions (8 events × 45 attendees):

| Provider | Annual Cost | vs Asaas |
|----------|-------------|----------|
| Asaas | R$ 2,119 | Baseline |
| Vindi | R$ 4,716 | +R$ 2,597 |
| Pagar.me | R$ 4,740 | +R$ 2,621 |
| Mercado Pago | R$ 7,008 | +R$ 4,889 |

**Asaas saves R$ 2,597 - R$ 4,889 annually** compared to alternatives.

### Key Decision Factors

1. **Lowest installment fees** - Critical since 50% of payments use installments
2. **Modern API** - RESTful with clear documentation and sandbox
3. **Full feature set** - Pix, credit, 6x installments, refunds, webhooks
4. **Brazil-focused** - Built for Brazilian market with CPF/CNPJ handling
5. **Transparent pricing** - No hidden fees, setup costs, or monthly fees

---

## Architecture

### How Payment Link Generation Works

When an admin clicks "Generate Payment Link" for a participant:

1. `generatePaymentLink()` in `app/business/admin/generate-payment-link.server.ts` is called
2. It validates the participant (regular spot, has CPF, not already paid, no active link)
3. Creates an Asaas customer via `getOrCreateAsaasCustomer()` (by email)
4. Creates **TWO Asaas charges in parallel** via `createPaymentCharge()`:
   - One Pix charge (R$ 220, `billingType: "PIX"`)
   - One Credit Card charge (R$ 227, 6x installments, `billingType: "CREDIT_CARD"`)
5. Stores both as separate rows in `payment_transactions` with `status: 'pending'`
6. Sets `payment_link_token` (random UUID), `payment_link_generated_at`, `payment_link_expires_at` (48h) on `event_participants`
7. Returns `{ token, pixInvoiceUrl, creditInvoiceUrl, whatsappMessage }`

### How Payment Confirmation Works

When a participant pays via one method (e.g., Pix):

1. Asaas sends webhook event (`PAYMENT_RECEIVED` or `PAYMENT_CONFIRMED`)
2. Webhook handler finds the matching `payment_transactions` row by `asaas_payment_id`
3. Confirms the transaction: `status: 'confirmed'`, sets `confirmed_at`
4. Sets `event_participants.payment_transaction_id` to the confirmed transaction
5. Sets `event_participants.has_paid = true`
6. **Deletes the sibling charge** in Asaas via `deletePayment()` and marks sibling transaction as `'cancelled'`
7. Sends success email

### Key Design Decisions

- **Two charges created upfront** — participant chooses between Pix and Credit Card on the payment page, both already exist in Asaas
- **Token-based payment links** — uses random UUID on `event_participants`, not the Asaas payment ID
- **Webhook-driven** — status changes come from Asaas webhooks, not polling
- **`payment_transaction_id` set on confirmation only** — FK on `event_participants` is NULL until payment succeeds
- **Denormalized fields** — `event_id`, `profile_id` on `payment_transactions` for fast queries
- **Feature flag** — all functionality gated by `ENABLE_PAYMENT_SYSTEM` env var

---

## Database Schema

### Table: `payment_transactions`

```sql
CREATE TABLE public.payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_participant_id UUID NOT NULL REFERENCES event_participants(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id),
    event_id UUID NOT NULL REFERENCES events(id),
    amount NUMERIC(10, 2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('pix', 'credit_card', 'boleto')),
    installments INTEGER,
    asaas_payment_id TEXT UNIQUE NOT NULL,
    asaas_customer_id TEXT NOT NULL,
    asaas_payment_data JSONB,
    status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'failed', 'refunded')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    refunded_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    refund_reason TEXT,
    CONSTRAINT refund_reason_required CHECK (
        (status != 'refunded') OR (refund_reason IS NOT NULL)
    )
);
```

**Indexes:** event_participant_id, profile_id, event_id, status, created_at (DESC), asaas_payment_data (GIN)

> **Note:** `'cancelled'` status will be added by POS-298 migration for sibling charge cancellation.

### Modified Table: `event_participants`

New fields:
```sql
payment_link_token TEXT UNIQUE,
payment_link_generated_at TIMESTAMPTZ,
payment_link_expires_at TIMESTAMPTZ,
payment_transaction_id UUID REFERENCES payment_transactions(id)
```

### Payment Status Logic

Status must aggregate across `payment_transactions`, not just check `payment_transaction_id`:

```typescript
function getPaymentStatus(participant, transactions): 'free' | 'paid' | 'pending' | 'no_link' {
  if (participant.spot_type !== 'regular') return 'free';
  if (transactions.some(t => t.status === 'confirmed')) return 'paid';
  if (transactions.some(t => t.status === 'pending')) return 'pending';
  return 'no_link';
}
```

---

## Asaas Client

**Location:** `app/integrations/asaas/client.server.ts`

| Function | Description |
|----------|-------------|
| `createPaymentCharge(params)` | Creates a single Asaas charge (Pix OR Credit Card). Called twice by `generatePaymentLink()`. |
| `getPaymentStatus(paymentId)` | Fetches payment status from Asaas |
| `refundPayment(paymentId, params)` | Processes refund (supports partial via `value?`) |
| `deletePayment(paymentId)` | Deletes a payment charge on Asaas (`DELETE /payments/{id}`) |
| `verifyWebhookSignature(token)` | Timing-safe comparison against `ASAAS_WEBHOOK_TOKEN` |
| `getOrCreateAsaasCustomer(params)` | Finds or creates Asaas customer by email |

**Constants** (`app/integrations/asaas/constants.ts`):
- `PAYMENT_PRICING`: Pix R$ 220 (22000 centavos), Credit R$ 227 (22700 centavos)
- `PAYMENT_LINK_EXPIRY_HOURS`: 48
- `PAYMENT_METHOD_CONFIG`: billing types, amounts, installment counts
- `WEBHOOK_EVENT_TO_TRANSACTION_STATUS`: maps Asaas events to DB statuses

---

## Implementation Tasks

All tasks tracked in Linear: [Sistema de Pagamentos](https://linear.app/positiv/project/sistema-de-pagamentos-cc14e6a9417c)

### Phase 0: Feature Flag ✅
- [POS-285](https://linear.app/positiv/issue/POS-285) - Add `ENABLE_PAYMENT_SYSTEM` environment variable

### Phase 1: Database Migrations ✅
- [POS-286](https://linear.app/positiv/issue/POS-286) - Create `payment_transactions` table
- [POS-287](https://linear.app/positiv/issue/POS-287) - Add payment link fields to `event_participants`

### Phase 2: Asaas API Client ✅
- [POS-288](https://linear.app/positiv/issue/POS-288) - Create types and constants
- [POS-289](https://linear.app/positiv/issue/POS-289) - Add environment variables
- [POS-290](https://linear.app/positiv/issue/POS-290) - Implement `createPaymentCharge()` (singular — creates one charge per call)
- [POS-291](https://linear.app/positiv/issue/POS-291) - Implement remaining client functions (`getPaymentStatus`, `refundPayment`, `deletePayment`, `verifyWebhookSignature`, `getOrCreateAsaasCustomer`)
- [POS-292](https://linear.app/positiv/issue/POS-292) - Add unit tests

### Phase 3: Email Templates ✅
- [POS-293](https://linear.app/positiv/issue/POS-293) - Payment link email
- [POS-294](https://linear.app/positiv/issue/POS-294) - Payment success email
- [POS-295](https://linear.app/positiv/issue/POS-295) - Payment failure email

### Phase 4: Payment Link Generation (partially done)
- [POS-296](https://linear.app/positiv/issue/POS-296) ✅ - Implement `generatePaymentLink()` (creates 2 Asaas charges + 2 DB transactions)
- [POS-297](https://linear.app/positiv/issue/POS-297) - Wire up admin mutation (schema in `common.ts`, action in view-event-page)

### Phase 5: Webhook Handler
- [POS-298](https://linear.app/positiv/issue/POS-298) - Implement webhook handler + DB migration for `'cancelled'` status + sibling charge deletion via `deletePayment()`

### Phase 6: Payment Routes
- [POS-299](https://linear.app/positiv/issue/POS-299) - Payment selection page (`/payment/:token`) — fetches 2 transactions, shows `invoiceUrl` per method
- [POS-300](https://linear.app/positiv/issue/POS-300) - Success/failure pages

### Phase 7-9: Admin UI (AG Grid)
- [POS-301](https://linear.app/positiv/issue/POS-301) - Extend `ActionButtonsRenderer` to support onClick callbacks
- [POS-302](https://linear.app/positiv/issue/POS-302) - Add "Generate Payment Link" button (AG Grid renderer + fetcher submit)
- [POS-303](https://linear.app/positiv/issue/POS-303) - Add `message` param to `phoneToWhatsAppLink()`
- [POS-304](https://linear.app/positiv/issue/POS-304) - Payment status badge column (`PaymentStatusBadgeRenderer` + LEFT JOIN)
- [POS-305](https://linear.app/positiv/issue/POS-305) - Refund logic
- [POS-306](https://linear.app/positiv/issue/POS-306) - Refund button in participant detail page (`view-event-participant.tsx`)

### Phase 10: Cron Job
- [POS-307](https://linear.app/positiv/issue/POS-307) - Expire payment links via `pg_cron` + `deletePayment()` + `INTERNAL_JOB_SECRET` auth

### Phase 11-14: Testing
- [POS-308](https://linear.app/positiv/issue/POS-308) - Unit tests (for new code only — POS-292/296 tests already exist)
- [POS-309](https://linear.app/positiv/issue/POS-309) - Integration tests (webhook flow + cron)
- [POS-310](https://linear.app/positiv/issue/POS-310) - E2E tests (AG Grid interactions)
- [POS-449](https://linear.app/positiv/issue/POS-449) - Asaas sandbox integration tests

### Phase 15: Launch
- [POS-311](https://linear.app/positiv/issue/POS-311) - Enable feature flag in production

---

## Environment Variables

```bash
# Feature Flag
ENABLE_PAYMENT_SYSTEM=false

# Asaas Integration
ASAAS_API_KEY=your_api_key
ASAAS_WEBHOOK_TOKEN=your_webhook_token
ASAAS_ENVIRONMENT=sandbox  # or 'production'

# Application
APP_URL=https://positiv.com.br

# Cron Jobs (shared with newsletter cron)
INTERNAL_JOB_SECRET=random_secret_for_cron_auth
```

---

## Admin Quick Reference

### Payment Flow

1. **Generate Link** - Click credit card icon on participant row (AG Grid table)
2. **Auto-actions** - Link copied, WhatsApp opens, email sent
3. **Participant Pays** - Chooses Pix or Credit Card on `/payment/:token` page, redirected to Asaas checkout
4. **Auto-confirmation** - Webhook updates status, deletes unused sibling charge, sends confirmation email

### Payment Status Badges

| Badge | Meaning |
|-------|---------|
| Blue "Gratuito" | Social/staff (free spot) |
| Yellow "Pendente" | Link generated, awaiting payment |
| Green "Pago" | Payment confirmed |
| Gray "Sem link" | Regular spot, no payment link yet |

### Processing Refunds

1. Open participant details
2. Click "Reembolsar" (red button)
3. Enter reason and confirm
4. System processes refund via Asaas

### Refund Timelines

| Method | Timeline |
|--------|----------|
| Pix | Up to 1 business day |
| Credit (à vista) | 5-10 business days |
| Credit (installments) | Invoice cancellation or 5-10 days |

---

## Troubleshooting

### Payment link button doesn't appear
- Check participant is `spot_type='regular'`
- Check participant doesn't already have payment or active link
- Verify `ENABLE_PAYMENT_SYSTEM=true`

### Payment confirmed but status not updated
- Wait 2-3 minutes (webhook delay)
- Check Asaas dashboard for payment status
- Verify webhook URL configuration in Asaas

### Email not received
- Check spam folder
- Verify email address is correct
- Check AWS SES sending limits

---

## Future Enhancements

- Bulk payment link generation
- Payment reminders before expiry
- Partial refunds
- Subscription/membership billing
- Early bird pricing
- Discount codes

---

*Last updated: March 2026*
