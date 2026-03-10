# Payment System - Asaas Integration

> **Linear Project:** [Sistema de Pagamentos](https://linear.app/positiv/project/sistema-de-pagamentos-cc14e6a9417c)
> **Status:** Planned (Not yet started)

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

## Implementation Tasks

All tasks tracked in Linear: [Sistema de Pagamentos](https://linear.app/positiv/project/sistema-de-pagamentos-cc14e6a9417c)

### Phase 0: Feature Flag
- [POS-285](https://linear.app/positiv/issue/POS-285) - Add `ENABLE_PAYMENT_SYSTEM` environment variable

### Phase 1: Database Migrations
- [POS-286](https://linear.app/positiv/issue/POS-286) - Create `payment_transactions` table
- [POS-287](https://linear.app/positiv/issue/POS-287) - Add payment link fields to `event_participants`

### Phase 2: Asaas API Client
- [POS-288](https://linear.app/positiv/issue/POS-288) - Create types and constants
- [POS-289](https://linear.app/positiv/issue/POS-289) - Add environment variables
- [POS-290](https://linear.app/positiv/issue/POS-290) - Implement `createPaymentCharges()`
- [POS-291](https://linear.app/positiv/issue/POS-291) - Implement remaining client functions
- [POS-292](https://linear.app/positiv/issue/POS-292) - Add unit tests

### Phase 3: Email Templates
- [POS-293](https://linear.app/positiv/issue/POS-293) - Payment link email
- [POS-294](https://linear.app/positiv/issue/POS-294) - Payment success email
- [POS-295](https://linear.app/positiv/issue/POS-295) - Payment failure email

### Phase 4: Payment Link Generation
- [POS-296](https://linear.app/positiv/issue/POS-296) - Implement `generatePaymentLink()`
- [POS-297](https://linear.app/positiv/issue/POS-297) - Add admin mutation

### Phase 5: Webhook Handler
- [POS-298](https://linear.app/positiv/issue/POS-298) - Implement webhook handler

### Phase 6: Payment Routes
- [POS-299](https://linear.app/positiv/issue/POS-299) - Payment selection page (`/payment/:token`)
- [POS-300](https://linear.app/positiv/issue/POS-300) - Success/failure pages

### Phase 7-9: Admin UI
- [POS-301](https://linear.app/positiv/issue/POS-301) - Add onClick support to DataTable buttons
- [POS-302](https://linear.app/positiv/issue/POS-302) - Add "Generate Payment Link" button
- [POS-303](https://linear.app/positiv/issue/POS-303) - WhatsApp integration
- [POS-304](https://linear.app/positiv/issue/POS-304) - Payment status column
- [POS-305](https://linear.app/positiv/issue/POS-305) - Refund logic
- [POS-306](https://linear.app/positiv/issue/POS-306) - Refund button in UI

### Phase 10: Cron Job
- [POS-307](https://linear.app/positiv/issue/POS-307) - Cleanup expired payment links

### Phase 11-14: Testing
- [POS-308](https://linear.app/positiv/issue/POS-308) - Unit tests
- [POS-309](https://linear.app/positiv/issue/POS-309) - Integration tests
- [POS-310](https://linear.app/positiv/issue/POS-310) - E2E tests

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
