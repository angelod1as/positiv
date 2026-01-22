# Payment System - Asaas Integration

## Overview

Automated payment system for event registrations in the Positiv platform. Integrated with Asaas for Brazilian payment processing.

**Key Features:**
- Generate unique payment links per participant
- Dual payment options: Pix (R$ 220) and Credit Card (R$ 227)
- Credit card supports up to 21x installments
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
3. **Full feature set** - Pix, credit, 21x installments, refunds, webhooks
4. **Brazil-focused** - Built for Brazilian market with CPF/CNPJ handling
5. **Transparent pricing** - No hidden fees, setup costs, or monthly fees

---

## Database Schema

### New Table: `payment_transactions`

```sql
CREATE TABLE public.payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_participant_id UUID NOT NULL REFERENCES event_participants(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id),
    amount NUMERIC(10, 2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('pix', 'credit_card')),
    installments INTEGER,
    asaas_payment_id TEXT UNIQUE NOT NULL,
    asaas_charge_id TEXT NOT NULL,
    asaas_data JSONB,
    status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'failed', 'refunded')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    refunded_at TIMESTAMPTZ,
    created_by UUID REFERENCES profiles(id),
    refund_reason TEXT
);
```

### Modified Table: `event_participants`

New fields:
```sql
payment_link_token TEXT UNIQUE,
payment_link_generated_at TIMESTAMPTZ,
payment_link_expires_at TIMESTAMPTZ,
payment_transaction_id UUID REFERENCES payment_transactions(id)
```

### Payment Status Logic

```typescript
function getPaymentStatus(participant): 'free' | 'pending' | 'paid' {
  if (participant.spot_type !== 'regular') return 'free';
  return participant.payment_transaction_id ? 'paid' : 'pending';
}
```

---

## Implementation Phases

### Phase 0: Feature Flag
- Add `ENABLE_PAYMENT_SYSTEM` environment variable
- Create `app/lib/features.server.ts` with `isPaymentSystemEnabled()`
- All payment features gated behind this flag

### Phase 1: Database Migrations
- Create `payment_transactions` table with RLS policies
- Add payment link fields to `event_participants`

### Phase 2: Asaas API Client
```
app/integrations/asaas/
├── client.ts       # API methods
├── types.ts        # TypeScript types
├── constants.ts    # URLs, pricing
└── client.test.ts  # Unit tests
```

Key methods:
- `createPaymentCharges()` - Creates Pix + Credit charges
- `getPaymentStatus()` - Check payment status
- `refundPayment()` - Process refunds
- `getOrCreateAsaasCustomer()` - Customer management

### Phase 3: Email Templates
Three templates in Portuguese:
- Payment link email (with link and pricing options)
- Payment success confirmation
- Payment failure notification

### Phase 4: Payment Link Generation
- `generatePaymentLink()` in `app/business/payments/`
- Creates unique token (nanoid, 7-day expiry)
- Creates Asaas charges (Pix + Credit)
- Sends email and returns WhatsApp message

### Phase 5: Webhook Handler
- Route: `app/routes/api.webhooks.asaas.ts`
- Handles: PAYMENT_CONFIRMED, PAYMENT_OVERDUE, PAYMENT_REFUNDED
- Links transaction to participant on confirmation
- Sends appropriate emails

### Phase 6: Payment Routes
- `/payment/:token` - Payment selection page
- `/payment/success` - Success confirmation
- `/payment/failure` - Failure page

### Phase 7-9: Admin UI
- Add payment status column to participants table
- Add "Generate Payment Link" button
- WhatsApp integration (opens with pre-filled message)
- Refund functionality with confirmation dialog

### Phase 10: Cron Job
- Daily cleanup of expired payment links
- Route: `app/routes/api.cron.expire-payment-links.ts`

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

# Cron Jobs
CRON_SECRET=random_secret_for_cron_auth
```

---

## Admin Quick Reference

### Payment Flow

1. **Generate Link** - Click credit card icon on participant row
2. **Auto-actions** - Link copied, WhatsApp opens, email sent
3. **Participant Pays** - Via Pix or credit card on Asaas checkout
4. **Auto-confirmation** - Webhook updates status, sends confirmation email

### Payment Status Badges

| Badge | Meaning |
|-------|---------|
| 🟦 Gratuito | Social/staff (free spot) |
| 🟨 Pendente | Link generated, awaiting payment |
| 🟩 Pago | Payment confirmed |

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
- Check participant doesn't already have payment
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

*This document describes the planned payment system. Implementation status: Not yet started.*
*Last updated: January 2025*
