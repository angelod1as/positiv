# Payment System - Technical Architecture

## Overview

Automated payment system integrated with Asaas for event registrations in the Positiv platform. Supports Pix and credit card payments with installments (up to 21x), WhatsApp integration for link delivery, webhook-based payment confirmation, and admin refund management.

**Key Features:**
- Generate unique payment links per participant
- Dual payment options: Pix (R$ 220) and Credit Card (R$ 227)
- WhatsApp integration with pre-filled messages
- Email notifications (link sent, success, failure)
- Webhook-based payment confirmation
- Admin refund capability
- Special handling for social/staff (free) spots

**Business Context:**
- Target: 8 events/year, 45 attendants average
- Payment mix: 50% credit installments, 30% credit à vista, 20% Pix
- Provider: Asaas (3.12% installment fees vs 9.99-20% competitors)
- Strategy: Absorb Pix fees, pass credit fees to customers

---

## Database Schema (Final Design)

### Modified Table: `event_participants`

**New fields added:**
```sql
-- Payment link tracking
payment_link_token TEXT UNIQUE,
payment_link_generated_at TIMESTAMPTZ,
payment_link_expires_at TIMESTAMPTZ,

-- Reference to confirmed payment
payment_transaction_id UUID REFERENCES payment_transactions(id)
```

**Existing fields (keep for backwards compatibility during rollout):**
```sql
payment NUMERIC(10, 2) NOT NULL DEFAULT 0,  -- DEPRECATED: Will be removed after migration
has_paid BOOLEAN NOT NULL DEFAULT false      -- DEPRECATED: Will be removed after migration
```

**Why keep deprecated fields?**
- Allows gradual rollout without breaking existing queries
- Can verify new system matches old data
- Easy rollback if needed
- Will be removed in future migration after verification

### New Table: `payment_transactions`

```sql
CREATE TABLE public.payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Relationships
    event_participant_id UUID NOT NULL REFERENCES event_participants(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id),

    -- Payment details
    amount NUMERIC(10, 2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('pix', 'credit_card')),
    installments INTEGER,  -- NULL for Pix, 1-21 for credit

    -- Asaas integration
    asaas_payment_id TEXT UNIQUE NOT NULL,   -- Asaas payment ID (returned from charge)
    asaas_charge_id TEXT NOT NULL,           -- Asaas charge ID (dual charges: Pix + Credit)
    asaas_data JSONB,                        -- Full Asaas webhook payload for audit

    -- Status tracking
    status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'failed', 'refunded')),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    refunded_at TIMESTAMPTZ,

    -- Audit
    created_by UUID REFERENCES profiles(id),  -- Admin who generated link (optional)
    refund_reason TEXT                        -- Reason for refund (if refunded)
);

-- Indexes
CREATE INDEX idx_payment_transactions_participant ON payment_transactions(event_participant_id);
CREATE INDEX idx_payment_transactions_profile ON payment_transactions(profile_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_payment_transactions_asaas_payment ON payment_transactions(asaas_payment_id);
```

### Data Model Logic

**Determining if participant has paid:**
```typescript
function isPaid(participant: EventParticipant): boolean {
  // Social/staff spots are always considered "paid" (free)
  if (participant.spot_type !== 'regular') return true;

  // Regular spots: check if payment transaction is linked
  return participant.payment_transaction_id !== null;
}
```

**Getting payment amount:**
```typescript
function getPaymentAmount(participant: EventParticipant): number {
  if (participant.spot_type !== 'regular') return 0;
  return participant.payment_transaction?.amount ?? 0;
}
```

**Payment status badge:**
```typescript
function getPaymentStatus(participant: EventParticipant): 'free' | 'pending' | 'paid' {
  if (participant.spot_type !== 'regular') return 'free';
  return participant.payment_transaction_id ? 'paid' : 'pending';
}
```

---

## Implementation Phases

### ⚠️ CRITICAL: Phase 0 - Feature Flag (MUST BE FIRST)

**This MUST be the first PR merged to main before any other payment system work.**

All subsequent changes will be behind this flag, allowing:
- Atomic CI/CD merges without breaking production
- Independent PR testing
- Easy rollback by toggling flag
- Gradual production rollout

#### Steps:

1. **Add environment variable to `app/env.server.ts`:**
```typescript
// Add to schema
ENABLE_PAYMENT_SYSTEM: z
  .string()
  .default('false')
  .transform((val) => val === 'true'),

// Add to type
export type ENV = {
  // ... existing fields
  ENABLE_PAYMENT_SYSTEM: boolean;
};
```

2. **Create feature flag helper `app/lib/features.server.ts`:**
```typescript
import { env } from '~/env.server';

export const FEATURES = {
  PAYMENT_SYSTEM: env.ENABLE_PAYMENT_SYSTEM,
} as const;

export function isPaymentSystemEnabled(): boolean {
  return FEATURES.PAYMENT_SYSTEM;
}
```

3. **Update `.env.example`:**
```bash
# Payment System
ENABLE_PAYMENT_SYSTEM=false  # Set to 'true' to enable payment system
```

4. **Usage pattern in code:**
```typescript
import { isPaymentSystemEnabled } from '~/lib/features.server';

export async function loader({ request }: LoaderFunctionArgs) {
  if (!isPaymentSystemEnabled()) {
    // Return without payment features or throw 404
    return json({ paymentEnabled: false });
  }

  // Payment system logic here
}
```

**Testing:**
- Verify flag defaults to `false`
- Verify setting to `true` enables features
- All subsequent PRs must check this flag

**Files changed:**
- `app/env.server.ts`
- `app/lib/features.server.ts` (new)
- `.env.example`

**Linear task:** `[payment] Adicionar feature flag ENABLE_PAYMENT_SYSTEM`

---

### Phase 1: Database Migrations

#### Migration 1: Create `payment_transactions` table

**File:** `supabase/migrations/YYYYMMDD_create_payment_transactions.sql`

```sql
-- Create payment_transactions table
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

CREATE INDEX idx_payment_transactions_participant ON payment_transactions(event_participant_id);
CREATE INDEX idx_payment_transactions_profile ON payment_transactions(profile_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_payment_transactions_asaas_payment ON payment_transactions(asaas_payment_id);

-- RLS Policies
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Admins can read all transactions
CREATE POLICY "Admins can view all transactions"
    ON public.payment_transactions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Users can view their own transactions
CREATE POLICY "Users can view own transactions"
    ON public.payment_transactions
    FOR SELECT
    TO authenticated
    USING (profile_id = auth.uid());
```

**Testing:**
- Run `pnpm supabase db reset`
- Run `pnpm db:types` to generate Kysely types
- Verify table exists in Supabase dashboard
- Verify RLS policies work

**Linear task:** `[payment] Criar tabela payment_transactions`

#### Migration 2: Add payment link fields to `event_participants`

**File:** `supabase/migrations/YYYYMMDD_add_payment_link_fields.sql`

```sql
-- Add payment link tracking fields
ALTER TABLE public.event_participants
ADD COLUMN payment_link_token TEXT UNIQUE,
ADD COLUMN payment_link_generated_at TIMESTAMPTZ,
ADD COLUMN payment_link_expires_at TIMESTAMPTZ,
ADD COLUMN payment_transaction_id UUID REFERENCES payment_transactions(id);

-- Index for quick token lookup
CREATE INDEX idx_event_participants_payment_token ON event_participants(payment_link_token);
CREATE INDEX idx_event_participants_payment_transaction ON event_participants(payment_transaction_id);
```

**Testing:**
- Run migration
- Generate types
- Verify columns exist
- Check indexes are created

**Linear task:** `[payment] Adicionar campos de link de pagamento em event_participants`

---

### Phase 2: Asaas API Client

#### File Structure:
```
app/integrations/asaas/
├── client.ts          # API methods
├── types.ts           # TypeScript types
├── constants.ts       # URLs, timeouts
└── client.test.ts     # Unit tests
```

#### `app/integrations/asaas/types.ts`

```typescript
export type AsaasEnvironment = 'sandbox' | 'production';

export interface AsaasCharge {
  id: string;
  customer: string;
  billingType: 'PIX' | 'CREDIT_CARD';
  value: number;
  dueDate: string;
  description: string;
  externalReference?: string;
  installmentCount?: number;
  installmentValue?: number;
}

export interface AsaasPayment {
  id: string;
  status: 'PENDING' | 'RECEIVED' | 'CONFIRMED' | 'OVERDUE' | 'REFUNDED';
  billingType: 'PIX' | 'CREDIT_CARD';
  value: number;
  netValue: number;
  externalReference?: string;  // Our payment_link_token (used to identify participant)
  confirmedDate?: string;
  paymentDate?: string;
  installmentCount?: number;
}

export interface AsaasWebhookPayload {
  event: 'PAYMENT_CREATED' | 'PAYMENT_UPDATED' | 'PAYMENT_CONFIRMED' |
         'PAYMENT_RECEIVED' | 'PAYMENT_OVERDUE' | 'PAYMENT_DELETED' |
         'PAYMENT_REFUNDED' | 'PAYMENT_REFUND_IN_PROGRESS';
  payment: AsaasPayment;
}

export interface CreateChargeParams {
  customer: string;         // Asaas customer ID
  billingType: 'PIX' | 'CREDIT_CARD';
  value: number;
  dueDate: string;         // ISO date
  description: string;
  externalReference: string;  // Our payment_link_token
  installmentCount?: number;  // For credit: 1-21
}

export interface RefundPaymentParams {
  paymentId: string;
  value?: number;  // Partial refund amount (optional)
  description?: string;
}
```

#### `app/integrations/asaas/constants.ts`

```typescript
export const ASAAS_API_URLS = {
  sandbox: 'https://sandbox.asaas.com/api/v3',
  production: 'https://api.asaas.com/v3',
} as const;

export const PAYMENT_PRICING = {
  PIX: 220.00,
  CREDIT: 227.00,
  LINK_EXPIRY_DAYS: 7,
  MAX_INSTALLMENTS: 21,
} as const;

export const WEBHOOK_EVENTS = {
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
  PAYMENT_CONFIRMED: 'PAYMENT_CONFIRMED',
  PAYMENT_OVERDUE: 'PAYMENT_OVERDUE',
  PAYMENT_DELETED: 'PAYMENT_DELETED',
  PAYMENT_REFUNDED: 'PAYMENT_REFUNDED',
} as const;
```

#### `app/integrations/asaas/client.ts`

```typescript
import { env } from '~/env.server';
import { ASAAS_API_URLS, PAYMENT_PRICING } from './constants';
import type {
  AsaasCharge,
  AsaasPayment,
  CreateChargeParams,
  RefundPaymentParams
} from './types';

const getAsaasClient = () => {
  const baseURL = ASAAS_API_URLS[env.ASAAS_ENVIRONMENT];
  const apiKey = env.ASAAS_API_KEY;

  return {
    baseURL,
    headers: {
      'access_token': apiKey,
      'Content-Type': 'application/json',
    },
  };
};

/**
 * Creates 2 charges in Asaas: one for Pix and one for Credit Card
 * Returns both charge IDs for the payment link
 */
export async function createPaymentCharges(params: {
  customerAsaasId: string;
  eventName: string;
  participantName: string;
  paymentLinkToken: string;
  dueDate: string;  // ISO date, 7 days from now
}): Promise<{ pixChargeId: string; creditChargeId: string }> {
  const { baseURL, headers } = getAsaasClient();

  const description = `${params.eventName} - ${params.participantName}`;

  // Create Pix charge
  const pixResponse = await fetch(`${baseURL}/payments`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      customer: params.customerAsaasId,
      billingType: 'PIX',
      value: PAYMENT_PRICING.PIX,
      dueDate: params.dueDate,
      description,
      externalReference: params.paymentLinkToken,
    }),
  });

  if (!pixResponse.ok) {
    const error = await pixResponse.json();
    throw new Error(`Asaas Pix charge failed: ${JSON.stringify(error)}`);
  }

  const pixCharge: AsaasCharge = await pixResponse.json();

  // Create Credit Card charge with installments
  const creditResponse = await fetch(`${baseURL}/payments`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      customer: params.customerAsaasId,
      billingType: 'CREDIT_CARD',
      value: PAYMENT_PRICING.CREDIT,
      dueDate: params.dueDate,
      description,
      externalReference: params.paymentLinkToken,
      installmentCount: PAYMENT_PRICING.MAX_INSTALLMENTS,
      installmentValue: PAYMENT_PRICING.CREDIT / PAYMENT_PRICING.MAX_INSTALLMENTS,
    }),
  });

  if (!creditResponse.ok) {
    const error = await creditResponse.json();
    throw new Error(`Asaas Credit charge failed: ${JSON.stringify(error)}`);
  }

  const creditCharge: AsaasCharge = await creditResponse.json();

  return {
    pixChargeId: pixCharge.id,
    creditChargeId: creditCharge.id,
  };
}

/**
 * Get payment status from Asaas
 */
export async function getPaymentStatus(paymentId: string): Promise<AsaasPayment> {
  const { baseURL, headers } = getAsaasClient();

  const response = await fetch(`${baseURL}/payments/${paymentId}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Asaas get payment failed: ${JSON.stringify(error)}`);
  }

  return response.json();
}

/**
 * Refund a payment in Asaas
 */
export async function refundPayment(params: RefundPaymentParams): Promise<void> {
  const { baseURL, headers } = getAsaasClient();

  const response = await fetch(`${baseURL}/payments/${params.paymentId}/refund`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      value: params.value,  // Partial refund if provided
      description: params.description || 'Reembolso solicitado pelo admin',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Asaas refund failed: ${JSON.stringify(error)}`);
  }
}

/**
 * Verify Asaas webhook signature
 * Asaas sends signature in 'asaas-access-token' header
 */
export function verifyWebhookSignature(signature: string): boolean {
  return signature === env.ASAAS_WEBHOOK_TOKEN;
}

/**
 * Get or create Asaas customer for a profile
 * For now, we'll use profile email as customer identifier
 */
export async function getOrCreateAsaasCustomer(profile: {
  id: string;
  email: string;
  name: string;
  cpf?: string;
}): Promise<string> {
  const { baseURL, headers } = getAsaasClient();

  // Try to find existing customer by email
  const searchResponse = await fetch(
    `${baseURL}/customers?email=${encodeURIComponent(profile.email)}`,
    { method: 'GET', headers }
  );

  if (searchResponse.ok) {
    const customers = await searchResponse.json();
    if (customers.data && customers.data.length > 0) {
      return customers.data[0].id;
    }
  }

  // Create new customer
  const createResponse = await fetch(`${baseURL}/customers`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: profile.name,
      email: profile.email,
      cpfCnpj: profile.cpf,
      externalReference: profile.id,
    }),
  });

  if (!createResponse.ok) {
    const error = await createResponse.json();
    throw new Error(`Asaas create customer failed: ${JSON.stringify(error)}`);
  }

  const customer = await createResponse.json();
  return customer.id;
}
```

#### Environment Variables

Add to `app/env.server.ts`:
```typescript
// Asaas Payment Integration
ASAAS_API_KEY: z.string(),
ASAAS_WEBHOOK_TOKEN: z.string(),
ASAAS_ENVIRONMENT: z.enum(['sandbox', 'production']).default('sandbox'),
```

Add to `.env.example`:
```bash
# Asaas Payment Integration
ASAAS_API_KEY=your_api_key_here
ASAAS_WEBHOOK_TOKEN=your_webhook_token_here
ASAAS_ENVIRONMENT=sandbox  # 'sandbox' or 'production'
```

**Testing:**
- Unit tests with mocked fetch
- Test success cases
- Test error handling
- Test webhook signature verification

**Linear tasks:**
1. `[payment] Criar estrutura do cliente Asaas (types, constants)`
2. `[payment] Implementar createPaymentCharges no cliente Asaas`
3. `[payment] Implementar getPaymentStatus e refundPayment no cliente Asaas`
4. `[payment] Implementar getOrCreateAsaasCustomer`
5. `[payment] Adicionar testes unitários para cliente Asaas`

---

### Phase 3: Email Templates

Create 3 email templates in Portuguese following existing brand style (purple gradient).

#### Pattern from existing emails:
- Use `app/business/email/templates/` directory
- Import shared styles from existing templates
- Use purple gradient brand colors
- Responsive HTML with proper fallbacks

#### `app/business/email/templates/payment-link-email.tsx`

```typescript
import type { ReactElement } from 'react';

interface PaymentLinkEmailProps {
  participantName: string;
  eventName: string;
  paymentLink: string;
  expiryDate: string;  // Formatted date
  pixPrice: number;
  creditPrice: number;
}

export function PaymentLinkEmail(props: PaymentLinkEmailProps): ReactElement {
  return (
    <div style={{
      fontFamily: 'Arial, sans-serif',
      maxWidth: '600px',
      margin: '0 auto',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '40px 20px',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '40px',
      }}>
        <h1 style={{
          color: '#1a202c',
          fontSize: '24px',
          marginBottom: '20px',
        }}>
          Olá, {props.participantName}!
        </h1>

        <p style={{ color: '#4a5568', fontSize: '16px', lineHeight: '1.6' }}>
          Seu link de pagamento para o evento <strong>{props.eventName}</strong> está pronto!
        </p>

        <div style={{
          margin: '30px 0',
          padding: '20px',
          background: '#f7fafc',
          borderRadius: '8px',
        }}>
          <p style={{ color: '#2d3748', margin: '0 0 10px 0' }}>
            <strong>Opções de pagamento:</strong>
          </p>
          <ul style={{ color: '#4a5568', paddingLeft: '20px' }}>
            <li>Pix: R$ {props.pixPrice.toFixed(2)}</li>
            <li>Cartão de Crédito em até 21x: R$ {props.creditPrice.toFixed(2)}</li>
          </ul>
        </div>

        <div style={{ textAlign: 'center', margin: '30px 0' }}>
          <a
            href={props.paymentLink}
            style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '15px 40px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 'bold',
              fontSize: '16px',
            }}
          >
            Realizar Pagamento
          </a>
        </div>

        <p style={{
          color: '#e53e3e',
          fontSize: '14px',
          textAlign: 'center',
          margin: '20px 0',
        }}>
          ⚠️ Este link expira em {props.expiryDate}
        </p>

        <div style={{
          borderTop: '1px solid #e2e8f0',
          paddingTop: '20px',
          marginTop: '30px',
        }}>
          <p style={{ color: '#718096', fontSize: '14px', margin: 0 }}>
            Dúvidas? Entre em contato conosco.
          </p>
        </div>
      </div>
    </div>
  );
}

export function getPaymentLinkEmailSubject(eventName: string): string {
  return `Link de Pagamento - ${eventName}`;
}
```

#### `app/business/email/templates/payment-success-email.tsx`

```typescript
import type { ReactElement } from 'react';

interface PaymentSuccessEmailProps {
  participantName: string;
  eventName: string;
  paymentMethod: string;  // 'Pix' or 'Cartão de Crédito'
  amount: number;
  installments?: number;
  paymentDate: string;
}

export function PaymentSuccessEmail(props: PaymentSuccessEmailProps): ReactElement {
  const installmentText = props.installments && props.installments > 1
    ? ` em ${props.installments}x`
    : '';

  return (
    <div style={{
      fontFamily: 'Arial, sans-serif',
      maxWidth: '600px',
      margin: '0 auto',
      background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
      padding: '40px 20px',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '40px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '10px',
          }}>
            ✅
          </div>
          <h1 style={{
            color: '#1a202c',
            fontSize: '24px',
            margin: 0,
          }}>
            Pagamento Confirmado!
          </h1>
        </div>

        <p style={{ color: '#4a5568', fontSize: '16px', lineHeight: '1.6' }}>
          Olá, {props.participantName}!
        </p>

        <p style={{ color: '#4a5568', fontSize: '16px', lineHeight: '1.6' }}>
          Seu pagamento para o evento <strong>{props.eventName}</strong> foi confirmado com sucesso.
        </p>

        <div style={{
          margin: '30px 0',
          padding: '20px',
          background: '#f0fff4',
          borderRadius: '8px',
          border: '1px solid #9ae6b4',
        }}>
          <p style={{ color: '#2d3748', margin: '0 0 10px 0' }}>
            <strong>Detalhes do pagamento:</strong>
          </p>
          <ul style={{ color: '#4a5568', paddingLeft: '20px', margin: 0 }}>
            <li>Método: {props.paymentMethod}{installmentText}</li>
            <li>Valor: R$ {props.amount.toFixed(2)}</li>
            <li>Data: {props.paymentDate}</li>
          </ul>
        </div>

        <p style={{ color: '#4a5568', fontSize: '16px', lineHeight: '1.6' }}>
          Você receberá mais informações sobre o evento em breve.
        </p>

        <p style={{ color: '#4a5568', fontSize: '16px', lineHeight: '1.6' }}>
          Nos vemos lá! 🎉
        </p>

        <div style={{
          borderTop: '1px solid #e2e8f0',
          paddingTop: '20px',
          marginTop: '30px',
        }}>
          <p style={{ color: '#718096', fontSize: '14px', margin: 0 }}>
            Equipe Positiv
          </p>
        </div>
      </div>
    </div>
  );
}

export function getPaymentSuccessEmailSubject(eventName: string): string {
  return `Pagamento Confirmado - ${eventName}`;
}
```

#### `app/business/email/templates/payment-failure-email.tsx`

```typescript
import type { ReactElement } from 'react';

interface PaymentFailureEmailProps {
  participantName: string;
  eventName: string;
  paymentLink: string;  // Same or new link for retry
  failureReason?: string;
}

export function PaymentFailureEmail(props: PaymentFailureEmailProps): ReactElement {
  return (
    <div style={{
      fontFamily: 'Arial, sans-serif',
      maxWidth: '600px',
      margin: '0 auto',
      background: 'linear-gradient(135deg, #fc8181 0%, #f56565 100%)',
      padding: '40px 20px',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '40px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '10px',
          }}>
            ⚠️
          </div>
          <h1 style={{
            color: '#1a202c',
            fontSize: '24px',
            margin: 0,
          }}>
            Problema no Pagamento
          </h1>
        </div>

        <p style={{ color: '#4a5568', fontSize: '16px', lineHeight: '1.6' }}>
          Olá, {props.participantName}!
        </p>

        <p style={{ color: '#4a5568', fontSize: '16px', lineHeight: '1.6' }}>
          Infelizmente, não conseguimos processar seu pagamento para o evento{' '}
          <strong>{props.eventName}</strong>.
        </p>

        {props.failureReason && (
          <div style={{
            margin: '20px 0',
            padding: '15px',
            background: '#fff5f5',
            borderRadius: '8px',
            border: '1px solid #fc8181',
          }}>
            <p style={{ color: '#742a2a', margin: 0, fontSize: '14px' }}>
              <strong>Motivo:</strong> {props.failureReason}
            </p>
          </div>
        )}

        <p style={{ color: '#4a5568', fontSize: '16px', lineHeight: '1.6' }}>
          Não se preocupe! Você pode tentar novamente clicando no botão abaixo:
        </p>

        <div style={{ textAlign: 'center', margin: '30px 0' }}>
          <a
            href={props.paymentLink}
            style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '15px 40px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 'bold',
              fontSize: '16px',
            }}
          >
            Tentar Novamente
          </a>
        </div>

        <div style={{
          borderTop: '1px solid #e2e8f0',
          paddingTop: '20px',
          marginTop: '30px',
        }}>
          <p style={{ color: '#718096', fontSize: '14px', margin: 0 }}>
            Se o problema persistir, entre em contato conosco.
          </p>
        </div>
      </div>
    </div>
  );
}

export function getPaymentFailureEmailSubject(eventName: string): string {
  return `Problema no Pagamento - ${eventName}`;
}
```

**Testing:**
- Visual testing in email client
- Test with Gmail, Outlook, Apple Mail
- Check responsive rendering
- Verify links work

**Linear tasks:**
1. `[payment] Criar template de email: link de pagamento`
2. `[payment] Criar template de email: pagamento confirmado`
3. `[payment] Criar template de email: falha no pagamento`

---

### Phase 4: Payment Link Generation

#### `app/business/payments/generate-payment-link.server.ts`

```typescript
import { nanoid } from 'nanoid';
import { addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { kysely } from '~/database/kysely.server';
import { createPaymentCharges, getOrCreateAsaasCustomer } from '~/integrations/asaas/client';
import { PAYMENT_PRICING } from '~/integrations/asaas/constants';
import { sendEmail } from '~/business/email/send-email';
import { renderToString } from 'react-dom/server';
import {
  PaymentLinkEmail,
  getPaymentLinkEmailSubject
} from '~/business/email/templates/payment-link-email';

interface GeneratePaymentLinkParams {
  eventParticipantId: string;
  adminId?: string;  // Optional: track who generated the link
}

interface GeneratePaymentLinkResult {
  success: boolean;
  paymentLink?: string;
  whatsappMessage?: string;
  error?: string;
}

export async function generatePaymentLink(
  params: GeneratePaymentLinkParams
): Promise<GeneratePaymentLinkResult> {
  try {
    // 1. Get participant and profile data
    const participant = await kysely
      .selectFrom('event_participants')
      .innerJoin('profiles', 'profiles.id', 'event_participants.profile_id')
      .innerJoin('events', 'events.id', 'event_participants.event_id')
      .select([
        'event_participants.id',
        'event_participants.spot_type',
        'event_participants.payment_transaction_id',
        'profiles.id as profile_id',
        'profiles.email',
        'profiles.name as profile_name',
        'profiles.phone',
        'profiles.cpf',
        'events.id as event_id',
        'events.name as event_name',
      ])
      .where('event_participants.id', '=', params.eventParticipantId)
      .executeTakeFirst();

    if (!participant) {
      return { success: false, error: 'Participant not found' };
    }

    // 2. Validate participant is eligible for payment link
    if (participant.spot_type !== 'regular') {
      return {
        success: false,
        error: 'Payment link only for regular spots (not social/staff)'
      };
    }

    if (participant.payment_transaction_id) {
      return {
        success: false,
        error: 'Participant already has confirmed payment'
      };
    }

    // 3. Generate unique token and expiry
    const token = nanoid(21);
    const generatedAt = new Date();
    const expiresAt = addDays(generatedAt, PAYMENT_PRICING.LINK_EXPIRY_DAYS);
    const dueDate = format(expiresAt, 'yyyy-MM-dd');

    // 4. Get or create Asaas customer
    const asaasCustomerId = await getOrCreateAsaasCustomer({
      id: participant.profile_id,
      email: participant.email,
      name: participant.profile_name,
      cpf: participant.cpf,
    });

    // 5. Create Asaas charges (Pix + Credit)
    const { pixChargeId, creditChargeId } = await createPaymentCharges({
      customerAsaasId: asaasCustomerId,
      eventName: participant.event_name,
      participantName: participant.profile_name,
      paymentLinkToken: token,
      dueDate,
    });

    // 6. Update event_participants with token and charges
    await kysely
      .updateTable('event_participants')
      .set({
        payment_link_token: token,
        payment_link_generated_at: generatedAt,
        payment_link_expires_at: expiresAt,
      })
      .where('id', '=', params.eventParticipantId)
      .execute();

    // 7. Generate payment link URL
    const paymentLink = `${process.env.APP_URL}/payment/${token}`;

    // 8. Send email with payment link
    const expiryDateFormatted = format(expiresAt, "dd/MM/yyyy 'às' HH:mm", {
      locale: ptBR
    });

    const emailHtml = renderToString(
      PaymentLinkEmail({
        participantName: participant.profile_name,
        eventName: participant.event_name,
        paymentLink,
        expiryDate: expiryDateFormatted,
        pixPrice: PAYMENT_PRICING.PIX,
        creditPrice: PAYMENT_PRICING.CREDIT,
      })
    );

    await sendEmail({
      to: participant.email,
      subject: getPaymentLinkEmailSubject(participant.event_name),
      html: emailHtml,
    });

    // 9. Generate WhatsApp message
    const whatsappMessage = `Olá! Aqui está o link para pagamento do evento ${participant.event_name}:

${paymentLink}

O link expira em ${expiryDateFormatted}. Escolha entre Pix (R$ ${PAYMENT_PRICING.PIX.toFixed(2)}) ou Cartão de Crédito em até 21x (R$ ${PAYMENT_PRICING.CREDIT.toFixed(2)}).`;

    return {
      success: true,
      paymentLink,
      whatsappMessage,
    };

  } catch (error) {
    console.error('Generate payment link error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

#### Add mutation to `app/business/admin/admin.server.ts`

```typescript
// Add to schema
export const generatePaymentLinkSchema = z.object({
  intent: z.literal('generate-payment-link'),
  id: z.string().uuid(),  // event_participant_id
});

// Add to mutation function
if (intent === 'generate-payment-link') {
  if (!isPaymentSystemEnabled()) {
    throw new Error('Payment system not enabled');
  }

  const result = await generatePaymentLink({
    eventParticipantId: formData.id,
    adminId: userId,
  });

  if (!result.success) {
    throw new Error(result.error || 'Failed to generate payment link');
  }

  return json({
    success: true,
    paymentLink: result.paymentLink,
    whatsappMessage: result.whatsappMessage,
  });
}
```

**Testing:**
- Unit test with mocked Asaas calls
- Test token generation uniqueness
- Test expiry date calculation
- Test email sending
- Integration test full flow

**Linear tasks:**
1. `[payment] Implementar lógica de geração de link de pagamento`
2. `[payment] Adicionar mutation generate-payment-link no admin.server.ts`

---

### Phase 5: Webhook Handler

#### `app/routes/api.webhooks.asaas.ts`

```typescript
import type { ActionFunctionArgs } from 'react-router';
import { json } from 'react-router';
import { kysely } from '~/database/kysely.server';
import { verifyWebhookSignature } from '~/integrations/asaas/client';
import { WEBHOOK_EVENTS } from '~/integrations/asaas/constants';
import type { AsaasWebhookPayload } from '~/integrations/asaas/types';
import { sendEmail } from '~/business/email/send-email';
import { renderToString } from 'react-dom/server';
import {
  PaymentSuccessEmail,
  getPaymentSuccessEmailSubject
} from '~/business/email/templates/payment-success-email';
import {
  PaymentFailureEmail,
  getPaymentFailureEmailSubject,
} from '~/business/email/templates/payment-failure-email';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { isPaymentSystemEnabled } from '~/lib/features.server';

export async function action({ request }: ActionFunctionArgs) {
  // Check feature flag
  if (!isPaymentSystemEnabled()) {
    return json({ error: 'Payment system not enabled' }, { status: 404 });
  }

  // Verify webhook signature
  const signature = request.headers.get('asaas-access-token');
  if (!signature || !verifyWebhookSignature(signature)) {
    console.error('Invalid webhook signature');
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse webhook payload
  const payload: AsaasWebhookPayload = await request.json();

  console.log('Asaas webhook received:', {
    event: payload.event,
    paymentId: payload.payment.id,
    status: payload.payment.status,
  });

  try {
    switch (payload.event) {
      case WEBHOOK_EVENTS.PAYMENT_RECEIVED:
        await handlePaymentReceived(payload);
        break;

      case WEBHOOK_EVENTS.PAYMENT_CONFIRMED:
        await handlePaymentConfirmed(payload);
        break;

      case WEBHOOK_EVENTS.PAYMENT_OVERDUE:
      case WEBHOOK_EVENTS.PAYMENT_DELETED:
        await handlePaymentFailed(payload);
        break;

      case WEBHOOK_EVENTS.PAYMENT_REFUNDED:
        await handlePaymentRefunded(payload);
        break;

      default:
        console.log('Unhandled webhook event:', payload.event);
    }

    return json({ success: true });

  } catch (error) {
    console.error('Webhook handler error:', error);
    return json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PAYMENT_RECEIVED: Precursor event to PAYMENT_CONFIRMED
 *
 * We do not handle this event to avoid creating orphaned pending transactions
 * with empty foreign keys that would violate NOT NULL constraints.
 * All transaction creation logic is handled in PAYMENT_CONFIRMED.
 */
async function handlePaymentReceived(payload: AsaasWebhookPayload) {
  console.log('Ignoring PAYMENT_RECEIVED event, will be handled by PAYMENT_CONFIRMED.');
  // Do nothing - all logic handled in PAYMENT_CONFIRMED
}

/**
 * PAYMENT_CONFIRMED: Link transaction to participant, send success email
 */
async function handlePaymentConfirmed(payload: AsaasWebhookPayload) {
  const payment = payload.payment;

  // The externalReference from Asaas contains our payment_link_token
  const paymentLinkToken = payment.externalReference;

  if (!paymentLinkToken) {
    console.error('Webhook payload missing externalReference for payment:', payment.id);
    return;
  }

  await kysely.transaction().execute(async (trx) => {
    // Find the participant using the unique payment_link_token
    const participant = await trx
      .selectFrom('event_participants')
      .innerJoin('profiles', 'profiles.id', 'event_participants.profile_id')
      .innerJoin('events', 'events.id', 'event_participants.event_id')
      .select([
        'event_participants.id',
        'profiles.id as profile_id',
        'profiles.email',
        'profiles.name as profile_name',
        'events.name as event_name',
      ])
      .where('event_participants.payment_link_token', '=', paymentLinkToken)
      .executeTakeFirst();

    if (!participant) {
      console.error('No participant found for payment_link_token:', paymentLinkToken);
      return;
    }

    // Create or update payment transaction
    const transaction = await trx
      .insertInto('payment_transactions')
      .values({
        asaas_payment_id: payment.id,
        asaas_charge_id: payment.id,
        event_participant_id: participant.id,
        profile_id: participant.profile_id,
        amount: payment.value,
        payment_method: payment.billingType === 'PIX' ? 'pix' : 'credit_card',
        installments: payment.installmentCount || null,
        status: 'confirmed',
        confirmed_at: new Date(),
        asaas_data: payment as any,
      })
      .onConflict((oc) =>
        oc.column('asaas_payment_id').doUpdateSet({
          event_participant_id: participant.id,
          profile_id: participant.profile_id,
          status: 'confirmed',
          confirmed_at: new Date(),
          asaas_data: payment as any,
        })
      )
      .returningAll()
      .executeTakeFirstOrThrow();

    // Link transaction to participant
    await trx
      .updateTable('event_participants')
      .set({
        payment_transaction_id: transaction.id,
        payment_link_token: null,  // Clear token after successful payment
        payment_link_generated_at: null,
        payment_link_expires_at: null,
      })
      .where('id', '=', participant.id)
      .execute();

    // Send success email
    const paymentMethodText = payment.billingType === 'PIX'
      ? 'Pix'
      : 'Cartão de Crédito';

    const paymentDate = format(
      new Date(payment.confirmedDate || payment.paymentDate || new Date()),
      "dd/MM/yyyy 'às' HH:mm",
      { locale: ptBR }
    );

    const emailHtml = renderToString(
      PaymentSuccessEmail({
        participantName: participant.profile_name,
        eventName: participant.event_name,
        paymentMethod: paymentMethodText,
        amount: payment.value,
        installments: payment.installmentCount,
        paymentDate,
      })
    );

    await sendEmail({
      to: participant.email,
      subject: getPaymentSuccessEmailSubject(participant.event_name),
      html: emailHtml,
    });
  });
}

/**
 * PAYMENT_OVERDUE / PAYMENT_DELETED: Mark as failed, send failure email
 */
async function handlePaymentFailed(payload: AsaasWebhookPayload) {
  const payment = payload.payment;

  // Update transaction status
  const transaction = await kysely
    .updateTable('payment_transactions')
    .set({
      status: 'failed',
      failed_at: new Date(),
      asaas_data: payment as any,
    })
    .where('asaas_payment_id', '=', payment.id)
    .returningAll()
    .executeTakeFirst();

  if (!transaction) {
    console.error('Transaction not found for failed payment:', payment.id);
    return;
  }

  // Get participant and event details
  const participant = await kysely
    .selectFrom('event_participants')
    .innerJoin('profiles', 'profiles.id', 'event_participants.profile_id')
    .innerJoin('events', 'events.id', 'event_participants.event_id')
    .select([
      'event_participants.payment_link_token',
      'profiles.email',
      'profiles.name as profile_name',
      'events.name as event_name',
    ])
    .where('event_participants.id', '=', transaction.event_participant_id)
    .executeTakeFirst();

  if (!participant) return;

  // Send failure email with retry link
  const retryLink = participant.payment_link_token
    ? `${process.env.APP_URL}/payment/${participant.payment_link_token}`
    : `${process.env.APP_URL}/events`;  // Fallback

  const emailHtml = renderToString(
    PaymentFailureEmail({
      participantName: participant.profile_name,
      eventName: participant.event_name,
      paymentLink: retryLink,
      failureReason: 'Pagamento não confirmado no prazo',
    })
  );

  await sendEmail({
    to: participant.email,
    subject: getPaymentFailureEmailSubject(participant.event_name),
    html: emailHtml,
  });
}

/**
 * PAYMENT_REFUNDED: Update transaction status and unlink from participant
 */
async function handlePaymentRefunded(payload: AsaasWebhookPayload) {
  const payment = payload.payment;

  await kysely.transaction().execute(async (trx) => {
    // Update the transaction to 'refunded'
    const transaction = await trx
      .updateTable('payment_transactions')
      .set({
        status: 'refunded',
        refunded_at: new Date(),
        asaas_data: payment as any,
      })
      .where('asaas_payment_id', '=', payment.id)
      .where('status', '=', 'confirmed') // Ensure we only refund confirmed payments
      .returning('id')
      .executeTakeFirst();

    if (!transaction) {
      console.warn(`Refund webhook for non-confirmed/non-existent transaction: ${payment.id}`);
      return;
    }

    // Unlink the transaction from the participant to allow them to pay again
    await trx
      .updateTable('event_participants')
      .set({ payment_transaction_id: null })
      .where('payment_transaction_id', '=', transaction.id)
      .execute();
  });

  // Note: Refunds initiated from our admin don't need email
  // Asaas sends their own refund confirmation
}
```

**Testing:**
- Unit tests with mocked database
- Test each webhook event type
- Test signature verification
- Integration tests with Asaas sandbox
- Test email sending

**Linear task:** `[payment] Implementar webhook handler para Asaas`

---

### Phase 6: Payment Confirmation Routes

#### `app/routes/payment.$token.tsx`

```typescript
import type { LoaderFunctionArgs } from 'react-router';
import { json, redirect } from 'react-router';
import { kysely } from '~/database/kysely.server';
import { isPaymentSystemEnabled } from '~/lib/features.server';
import { PAYMENT_PRICING } from '~/integrations/asaas/constants';

export async function loader({ params }: LoaderFunctionArgs) {
  if (!isPaymentSystemEnabled()) {
    throw redirect('/');
  }

  const token = params.token;
  if (!token) {
    throw redirect('/payment/failure');
  }

  // Get participant and event data
  const participant = await kysely
    .selectFrom('event_participants')
    .innerJoin('profiles', 'profiles.id', 'event_participants.profile_id')
    .innerJoin('events', 'events.id', 'event_participants.event_id')
    .select([
      'event_participants.id',
      'event_participants.payment_link_expires_at',
      'event_participants.payment_transaction_id',
      'profiles.name as profile_name',
      'events.name as event_name',
      'events.description as event_description',
    ])
    .where('event_participants.payment_link_token', '=', token)
    .executeTakeFirst();

  if (!participant) {
    throw redirect('/payment/failure?reason=invalid_token');
  }

  // Check if already paid
  if (participant.payment_transaction_id) {
    throw redirect('/payment/success');
  }

  // Check if expired
  if (participant.payment_link_expires_at &&
      new Date(participant.payment_link_expires_at) < new Date()) {
    throw redirect('/payment/failure?reason=expired');
  }

  return json({
    participantName: participant.profile_name,
    eventName: participant.event_name,
    eventDescription: participant.event_description,
    pixPrice: PAYMENT_PRICING.PIX,
    creditPrice: PAYMENT_PRICING.CREDIT,
    maxInstallments: PAYMENT_PRICING.MAX_INSTALLMENTS,
    // Asaas checkout URLs would be generated here
    asaasCheckoutUrl: `https://sandbox.asaas.com/checkout/${token}`,  // Placeholder
  });
}

export default function PaymentPage() {
  // React component for payment selection
  // Will have buttons for Pix and Credit Card
  // Redirects to Asaas checkout

  return (
    <div>
      {/* Payment selection UI */}
    </div>
  );
}
```

#### `app/routes/payment.success.tsx`

```typescript
import { isPaymentSystemEnabled } from '~/lib/features.server';
import { redirect } from 'react-router';

export function loader() {
  if (!isPaymentSystemEnabled()) {
    throw redirect('/');
  }

  return null;
}

export default function PaymentSuccess() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Pagamento Confirmado!
        </h1>
        <p className="text-gray-600 mb-6">
          Você receberá um email de confirmação em instantes com todos os detalhes.
        </p>
        <p className="text-gray-600">
          Nos vemos no evento! 🎉
        </p>
      </div>
    </div>
  );
}
```

#### `app/routes/payment.failure.tsx`

```typescript
import { json, type LoaderFunctionArgs } from 'react-router';
import { isPaymentSystemEnabled } from '~/lib/features.server';
import { redirect } from 'react-router';

export function loader({ request }: LoaderFunctionArgs) {
  if (!isPaymentSystemEnabled()) {
    throw redirect('/');
  }

  const url = new URL(request.url);
  const reason = url.searchParams.get('reason');

  return json({ reason });
}

export default function PaymentFailure() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Problema no Pagamento
        </h1>
        <p className="text-gray-600 mb-6">
          Não foi possível processar seu pagamento. Você receberá um email com instruções para tentar novamente.
        </p>
        <p className="text-sm text-gray-500">
          Se o problema persistir, entre em contato conosco.
        </p>
      </div>
    </div>
  );
}
```

**Testing:**
- E2E test payment flow
- Test expired token handling
- Test already paid handling
- Test invalid token handling

**Linear tasks:**
1. `[payment] Criar rota de seleção de pagamento (/payment/:token)`
2. `[payment] Criar páginas de confirmação (success/failure)`

---

### Phase 7: Admin UI - Button Support

Update DataTable button component to support onClick handlers.

#### `app/components/organisms/tables/admin/participants-table/view-event-participants-table.tsx`

```typescript
// Update button type to support onClick
type TableButton<T> = {
  Icon: LucideIcon;
  title: string;
  key: keyof T;
} & (
  | { to: (id: string) => string; onClick?: never }
  | { onClick: (row: T) => void | Promise<void>; to?: never }
);

// Update button renderer
{buttons?.map((button) => {
  const isClickable = !!button.onClick;

  if (isClickable) {
    return (
      <button
        key={button.title}
        onClick={(e) => {
          e.stopPropagation();
          button.onClick?.(rowData);
        }}
        title={button.title}
        className="p-2 hover:bg-gray-100 rounded transition-colors"
      >
        <button.Icon className="h-4 w-4 text-gray-600" />
      </button>
    );
  }

  // Existing navigation button code
  return (
    <Link
      key={button.title}
      to={button.to(String(rowData[button.key]))}
      title={button.title}
      className="p-2 hover:bg-gray-100 rounded transition-colors"
    >
      <button.Icon className="h-4 w-4 text-gray-600" />
    </Link>
  );
})}
```

**Testing:**
- Test onClick buttons work
- Test navigation buttons still work
- Test event propagation

**Linear task:** `[payment] Adicionar suporte a onClick nos botões da DataTable`

---

### Phase 8: Admin UI - Generate Payment Link Button

#### Update `view-event-participants-table.tsx`

```typescript
import { CreditCardIcon } from 'lucide-react';
import { useFetcher } from 'react-router';
import { toast } from 'sonner';
import { phoneToWhatsAppLink } from '~/lib/helpers/phone-to-whatsapp-link';

// Inside component
const paymentFetcher = useFetcher();

// Add button to buttons array
const buttons = [
  // ... existing buttons
  {
    Icon: CreditCardIcon,
    title: 'Gerar link de pagamento',
    key: 'id' as const,
    onClick: async (row: ParticipantRow) => {
      // Only show for regular spots without payment
      if (row.spot_type !== 'regular' || row.payment_transaction_id) {
        return;
      }

      paymentFetcher.submit(
        {
          intent: 'generate-payment-link',
          id: row.id,
        },
        { method: 'post' }
      );
    },
  },
];

// Handle fetcher response
useEffect(() => {
  if (paymentFetcher.data?.success) {
    const { paymentLink, whatsappMessage } = paymentFetcher.data;

    // Copy link to clipboard
    navigator.clipboard.writeText(paymentLink);
    toast.success('Link copiado para área de transferência!');

    // Open WhatsApp with pre-filled message
    const phone = /* get participant phone */;
    if (phone) {
      const whatsappUrl = phoneToWhatsAppLink(phone, whatsappMessage);
      window.open(whatsappUrl, '_blank');
    }
  }

  if (paymentFetcher.data?.error) {
    toast.error(`Erro ao gerar link: ${paymentFetcher.data.error}`);
  }
}, [paymentFetcher.data]);

// Conditionally render button based on payment status
const shouldShowPaymentButton = (row: ParticipantRow) => {
  return row.spot_type === 'regular' && !row.payment_transaction_id;
};
```

#### Update `app/lib/helpers/phone-to-whatsapp-link.ts`

```typescript
export const phoneToWhatsAppLink = (phone: unknown, message?: string) => {
  if (!phone) return undefined;

  const cleanedPhone = phone.toString().replace(/\s/g, '').replace(/-/g, '');
  const phoneNumber = cleanedPhone.length === 11
    ? `55${cleanedPhone}`
    : cleanedPhone;

  const baseUrl = `https://wa.me/${phoneNumber}`;

  if (message) {
    const encodedMessage = encodeURIComponent(message);
    return `${baseUrl}?text=${encodedMessage}`;
  }

  return baseUrl;
};
```

**Testing:**
- Test button appears only for regular unpaid participants
- Test clipboard copy
- Test WhatsApp opens with message
- Test error handling

**Linear tasks:**
1. `[payment] Adicionar botão "Gerar Link de Pagamento" na tabela de participantes`
2. `[payment] Implementar integração com WhatsApp (pré-preenchimento de mensagem)`

---

### Phase 9: Admin UI - Payment Status Column

Add payment status badge column to participants table.

```typescript
// Add to columns
{
  field: 'payment_status',
  header: 'Pagamento',
  body: (rowData: ParticipantRow) => {
    const status = getPaymentStatus(rowData);

    const badges = {
      free: <Badge variant="info">Gratuito</Badge>,
      pending: <Badge variant="warning">Pendente</Badge>,
      paid: <Badge variant="success">Pago</Badge>,
    };

    return badges[status];
  },
}

// Helper function
function getPaymentStatus(row: ParticipantRow): 'free' | 'pending' | 'paid' {
  if (row.spot_type !== 'regular') return 'free';
  return row.payment_transaction_id ? 'paid' : 'pending';
}
```

Update loader to LEFT JOIN payment_transactions:
```typescript
const participants = await kysely
  .selectFrom('event_participants')
  .leftJoin('payment_transactions', 'payment_transactions.id', 'event_participants.payment_transaction_id')
  .select([
    // ... existing fields
    'event_participants.payment_transaction_id',
    'payment_transactions.amount as payment_amount',
    'payment_transactions.payment_method',
  ])
  .execute();
```

**Testing:**
- Test badges show correct status
- Test data loads correctly

**Linear task:** `[payment] Adicionar coluna de status de pagamento na tabela`

---

### Phase 10: Admin UI - Refund Button

Add refund capability in participant details page.

#### `app/routes/admin.events.$eventId.participants.$participantId.tsx`

```typescript
import { refundPayment } from '~/business/payments/refund-payment.server';

// Add action handler
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'refund-payment') {
    if (!isPaymentSystemEnabled()) {
      return json({ error: 'Payment system not enabled' }, { status: 400 });
    }

    const paymentTransactionId = formData.get('payment_transaction_id');
    const reason = formData.get('reason');

    await refundPayment({
      paymentTransactionId: String(paymentTransactionId),
      reason: String(reason),
      adminId: userId,
    });

    return json({ success: true });
  }
}

// Add refund dialog in UI
function RefundButton({ participant }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const fetcher = useFetcher();

  if (!participant.payment_transaction_id) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">Reembolsar</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar Reembolso</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p>Tem certeza que deseja reembolsar este pagamento?</p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo do reembolso..."
            className="w-full p-2 border rounded"
          />
          <fetcher.Form method="post">
            <input type="hidden" name="intent" value="refund-payment" />
            <input type="hidden" name="payment_transaction_id" value={participant.payment_transaction_id} />
            <input type="hidden" name="reason" value={reason} />
            <Button type="submit">Confirmar Reembolso</Button>
          </fetcher.Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

#### `app/business/payments/refund-payment.server.ts`

```typescript
import { kysely } from '~/database/kysely.server';
import { refundPayment as asaasRefund } from '~/integrations/asaas/client';

export async function refundPayment(params: {
  paymentTransactionId: string;
  reason: string;
  adminId: string;
}): Promise<void> {
  // Note: This function only INITIATES the refund via Asaas API.
  // The database update is handled by the PAYMENT_REFUNDED webhook
  // to ensure consistency with the payment provider's state.

  // Get transaction
  const transaction = await kysely
    .selectFrom('payment_transactions')
    .select(['id', 'status', 'asaas_payment_id'])
    .where('id', '=', params.paymentTransactionId)
    .executeTakeFirstOrThrow();

  if (transaction.status !== 'confirmed') {
    throw new Error('Can only refund confirmed payments');
  }

  // Store refund reason in transaction for webhook handler to use
  await kysely
    .updateTable('payment_transactions')
    .set({ refund_reason: params.reason })
    .where('id', '=', params.paymentTransactionId)
    .execute();

  // Call Asaas refund API to initiate the refund process
  // The rest of the logic (updating status, unlinking from participant)
  // is handled by the handlePaymentRefunded webhook handler
  await asaasRefund({
    paymentId: transaction.asaas_payment_id,
    description: params.reason,
  });
}
```

**Testing:**
- Test refund dialog
- Test Asaas refund call
- Test transaction update
- E2E refund flow

**Linear tasks:**
1. `[payment] Implementar lógica de reembolso`
2. `[payment] Adicionar botão de reembolso na página de detalhes`

---

### Phase 11: Payment Link Expiry Cleanup

#### `app/routes/api.cron.expire-payment-links.ts`

```typescript
import type { ActionFunctionArgs } from 'react-router';
import { json } from 'react-router';
import { kysely } from '~/database/kysely.server';
import { isPaymentSystemEnabled } from '~/lib/features.server';
import { env } from '~/env.server';

export async function action({ request }: ActionFunctionArgs) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isPaymentSystemEnabled()) {
    return json({ success: true, expired: 0 });
  }

  // Clear expired payment links
  const result = await kysely
    .updateTable('event_participants')
    .set({
      payment_link_token: null,
      payment_link_generated_at: null,
      payment_link_expires_at: null,
    })
    .where('payment_link_expires_at', '<', new Date())
    .where('payment_transaction_id', 'is', null)  // Only clear if not paid
    .executeTakeFirst();

  const expiredCount = Number(result.numUpdatedRows || 0);

  console.log(`Expired ${expiredCount} payment links`);

  return json({ success: true, expired: expiredCount });
}
```

#### Configure Cron Job

Set up a cron job in your hosting platform (Coolify, external cron service, or system cron) to call:
- **Endpoint**: `/api/cron/expire-payment-links`
- **Schedule**: `0 2 * * *` (daily at 2 AM)
- **Method**: POST with `Authorization: Bearer <CRON_SECRET>`

Add to `.env.example`:
```bash
CRON_SECRET=generate_random_secret_here
```

**Testing:**
- Test cron endpoint manually
- Test authorization
- Test expiry logic

**Linear task:** `[payment] Adicionar cron job para limpar links expirados`

---

## Environment Variables Reference

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

## Security Considerations

1. **Webhook Verification**: Always verify Asaas webhook signatures
2. **Feature Flag**: Keeps unreleased code safe in production
3. **Database Transactions**: Use transactions for multi-step operations
4. **Token Uniqueness**: nanoid(21) provides ~183 years to collision at 1000 IDs/hour
5. **Expiry Dates**: 7-day expiry prevents link reuse
6. **RLS Policies**: Supabase RLS protects payment_transactions table
7. **HTTPS Only**: All payment links must use HTTPS
8. **PCI Compliance**: Asaas handles all card data (we never touch it)

---

## Local Development Setup

### 1. Asaas Sandbox Account
- Sign up at https://sandbox.asaas.com
- Get API key from "Integrações" → "API"
- Generate webhook token
- Configure webhook URL: `https://your-dev-url/api/webhooks/asaas`

### 2. Environment Variables
```bash
cp .env.example .env
# Fill in Asaas credentials
```

### 3. Database Migration
```bash
pnpm supabase db reset
pnpm db:types
```

### 4. Enable Feature Flag
```bash
ENABLE_PAYMENT_SYSTEM=true
```

### 5. Test with Asaas Test Cards
- Success: `5162306219378829`
- Failure: Various test cards for different scenarios
- Pix: Use sandbox Pix QR codes

---

## Testing Strategy

### Unit Tests
- Asaas client methods (mocked fetch)
- Payment link generation logic
- Webhook event handlers
- Refund logic
- Helper functions (isPaid, getPaymentStatus)

### Integration Tests
- Full webhook flow (PAYMENT_RECEIVED → PAYMENT_CONFIRMED)
- Payment failure flow with email
- Refund flow
- Database transactions

### E2E Tests
1. Admin generates payment link
2. Admin copies link and opens WhatsApp
3. User visits payment page (mocked)
4. Webhook confirms payment
5. Admin sees "Pago" status
6. Admin processes refund

### Manual Testing Checklist
- [ ] Generate payment link in admin
- [ ] Receive payment link email
- [ ] Visit payment page (not expired)
- [ ] Visit payment page (expired) → see error
- [ ] Make Pix payment in sandbox
- [ ] Receive success email
- [ ] Admin sees payment status updated
- [ ] Admin refunds payment
- [ ] Verify payment status cleared
- [ ] Test with social/staff (no payment button)
- [ ] Test cron job clears expired links

---

## Deployment Checklist

### Pre-deployment
- [ ] All tests passing
- [ ] Feature flag defaults to `false`
- [ ] Migrations tested on staging
- [ ] Asaas production credentials configured
- [ ] Webhook URL configured in Asaas production
- [ ] Email templates tested in production email client

### Deployment
- [ ] Merge all PRs to main (behind feature flag)
- [ ] Deploy to production (auto-deploy from main)
- [ ] Run migrations: `pnpm supabase db push`
- [ ] Set `ENABLE_PAYMENT_SYSTEM=true` in production env
- [ ] Verify cron job is scheduled

### Post-deployment
- [ ] Test payment link generation with real event
- [ ] Monitor Asaas webhooks in dashboard
- [ ] Check email delivery
- [ ] Test Pix payment with small amount
- [ ] Test credit card payment
- [ ] Monitor error logs
- [ ] Verify cron job runs at 2 AM

---

## Monitoring & Observability

### Key Metrics to Track
- Payment link generation rate
- Payment success rate (Pix vs Credit)
- Payment failure rate
- Webhook delivery failures
- Email send failures
- Average time from link generation to payment
- Refund rate

### Logs to Monitor
- `Asaas webhook received:` - Track webhook events
- `Generate payment link error:` - Link generation failures
- `Webhook handler error:` - Webhook processing failures
- `Expired N payment links` - Cron job runs

### Asaas Dashboard
- Monitor webhook delivery status
- Check payment status
- View customer list
- Track refunds

---

## Future Enhancements

### Phase 2 (Post-MVP)
1. **Remove deprecated fields**: After verifying new system works, remove `has_paid` and `payment` from `event_participants`
2. **Bulk payment link generation**: Generate links for multiple participants at once
3. **Payment reminders**: Auto-send reminder 3 days before expiry
4. **Payment installment tracking**: Track which installments were paid
5. **Subscription system**: Use Asaas subscriptions for membership

### Nice to Have
- Payment analytics dashboard for admins
- Export payment data to CSV
- Partial refunds
- Payment plan customization per event
- Early bird pricing
- Discount codes

---

## Troubleshooting

### Payment link doesn't generate
- Check feature flag is enabled
- Verify Asaas credentials are correct
- Check participant is `spot_type='regular'`
- Check participant doesn't already have payment
- Check Asaas API logs

### Webhook not received
- Verify webhook URL in Asaas dashboard
- Check webhook token matches
- Test webhook manually with curl
- Check Vercel/hosting provider logs

### Email not sent
- Check AWS SES credentials
- Verify email template renders correctly
- Check recipient email is valid
- Check SES sending limits

### Payment shows as pending forever
- Check Asaas payment status manually
- Verify webhook signature is correct
- Check if PAYMENT_CONFIRMED webhook was received
- Look for errors in webhook handler logs

---

This completes the technical architecture documentation. All implementation details, database schemas, code examples, testing strategies, and deployment procedures are covered above.
