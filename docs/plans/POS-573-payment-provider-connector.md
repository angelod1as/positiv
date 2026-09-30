# POS-573 — Payment provider connector: keep Asaas out of the domain code

## Decisions (agreed 2026-09-30)

- `payments.asaas_net` is **dropped**, along with `installmentNetCents` and the
  `netValue` parsing. Fees are the provider's to report.
- `payment_kind` value `'asaas'` becomes **`'online'`**. No `provider` column:
  a provider swap is a clean cutover.
- The webhook moves to **`/api/payment/webhook`**. Nothing is registered in
  production yet; the sandbox is re-registered with
  `scripts/asaas/register-webhook.ts`.
- Admin copy takes the provider's **display name from the connector**
  (`"Asaas"`), so admins still read "Reembolsar no Asaas" and the code names
  no provider.

## Target shape

```
app/business/payment/
├── payment-provider.ts               # our interface + domain types, no Asaas
├── payment-provider.server.ts        # paymentProvider(): the one place a connector is chosen
└── provider/asaas/
    ├── asaas-client.server.ts        # moved as is (HTTP, AsaasError)
    ├── asaas-connector.server.ts     # implements PaymentProvider
    ├── asaas-webhook.server.ts       # token check, schema, event translation
    └── asaas-error-message.ts        # moved; becomes connector.errorMessage
```

The interface:

```ts
type ProviderRefund = { amount: number; state: "done" | "pending" | "cancelled" } // cents

type PaymentEvent = {
  eventId: string
  providerType: string                // raw name, for the inbox and the logs
  chargeId: string | null
  planId: string | null               // one charge per installment → one plan
  reference: string | null            // our payments.id
} & (
  | { type: "paid"; amount: number | null }
  | { type: "overdue" | "cancelled" | "restored" | "refund_in_progress" }
  | { type: "updated"; amount: number | null; dueAt: string | null }
  | { type: "refunded" | "partially_refunded"; refunds: ProviderRefund[] | null }
  | { type: "refund_denied"; reason: string | null }
  | { type: "alarm" }                 // chargeback, capture refused, risk analysis
  | { type: "ignored" }
)

interface PaymentProvider {
  name: string                        // "Asaas", for the copy
  isConfigured(): boolean
  ensureCustomer(profile): Promise<string>        // find by CPF, else create
  createCharge(input): Promise<CreatedCharge>     // { chargeId, planId, checkoutUrl, dashboardRef }
  cancelCharge(chargeId): Promise<boolean>
  fetchRefunds({ chargeId, planId }): Promise<ProviderRefund[]>
  chargeDashboardUrl(dashboardRef): string | null
  readWebhook(request): Promise<{ ok: true; event: PaymentEvent } | { ok: false; status: number; error: string }>
  errorMessage(error, context: "checkout" | "sync"): string
}
```

The Asaas-only rules move into the connector with their comments: reais →
cents, the Brazilian due date, the phone retry, `DONE`/`CANCELLED` refund
statuses, "PAYMENT_REFUNDED without a list means the whole charge", and the
event-name tables. The domain keeps the transitions, the locks, the guarded
updates, the plan tally and the outbox.

## Schema — one new migration

`20260930120000_payment_provider_neutral_names.sql`. It adds a migration and
edits none.

| Today | After |
|---|---|
| enum `payment_kind` `'asaas'` | `'online'` (`ALTER TYPE … RENAME VALUE`) |
| `payments.asaas_customer_id` | `provider_customer_id` |
| `payments.asaas_payment_id` | `provider_charge_id` |
| `payments.asaas_installment_id` | `provider_plan_id` |
| `payments.asaas_invoice_url` | `provider_checkout_url` |
| `payments.asaas_invoice_number` | `provider_dashboard_ref` |
| `payments.asaas_net` | dropped (`payments_manual_shape` recreated without it) |
| `profiles.asaas_customer_id` | `provider_customer_id` |
| `payment_webhook_events.asaas_event_id` | `provider_event_id` |
| `payment_webhook_events.asaas_payment_id` | `provider_charge_id` |
| — | `payment_webhook_events.provider_plan_id text`, `event jsonb` (the translated event) |
| indexes/constraints `*_asaas_*` | `*_provider_*`, `payments_asaas_shape` → `payments_online_shape` |

- The inbox keeps the raw `payload` for audit. The plan refund tally reads
  `event` and `provider_plan_id` and never the payload. The migration backfills
  both from existing Asaas payloads, so a local or staging inbox keeps working.
- Column comments are rewritten without the provider's name.
- Renames keep grants and RLS. Checked with `has_function_privilege` and
  `rls-security.integration.test.ts`, then `get_advisors` security and
  performance.
- Applied locally with `supabase migration up`. **No `supabase db reset`
  until you say so.** The clean-state reset happens just before E2E, with your
  go-ahead.

## Steps and commits

Each commit stays green (`pnpm lint`, related tests) and is written test-first.

1. **`refactor(payment): move the Asaas client under provider/asaas`**
   A pure move of `asaas-client.server.ts` and `asaas-error-message.ts` with
   their tests. Imports updated, no behaviour change.

2. **`feat(payment): define the payment provider interface`**
   `payment-provider.ts` holds the types only, and `payment-provider.server.ts`
   returns the Asaas connector.

3. **`feat(payment): implement the Asaas connector for customers, charges and cancellation`**
   Red: unit tests for `ensureCustomer` (reuses the stored id; finds by CPF;
   creates; phone retry), `createCharge` (maps to `CreatedCharge`),
   `cancelCharge`, `chargeDashboardUrl` (sandbox and production), `name`,
   `isConfigured`. Green: the connector wraps the client.
   `ensureCustomer` takes over the Asaas half of today's `ensureAsaasCustomer`
   (find or create). The race-guarded write to `profiles` stays in the domain.

4. **`refactor(payment): open and cancel charges through the connector`**
   `payment-checkout`, `payment-offer` (`deleteReplacedCharges`) and
   `payment-cancel` call `paymentProvider()`. The existing checkout, offer and
   cancel integration suites stay green unchanged. They are the safety net.

5. **`feat(payment): read refunds through the connector`**
   Red: unit tests for `fetchRefunds` (charge vs plan endpoint; `DONE`→done,
   `CANCELLED`→cancelled, anything else→pending; reais→cents).
   Green: `tallyRefunds` takes `ProviderRefund[]` and stops knowing Asaas
   statuses. `syncPaymentFromAsaas` is renamed `syncPaymentFromProvider`.
   `payment-sync` and `refund-state` suites updated.

6. **`refactor(payment): translate provider errors in the connector`**
   `asaasErrorMessage` becomes `connector.errorMessage`. Checkout and sync call
   it through the interface. `paymentsCopy.asaasErrors` is renamed
   `providerErrors`, with the provider name as a parameter.

7. **`feat(db): name payment columns after the provider role, not Asaas`**
   The migration, `pnpm db:types --local`, and every column, enum and index
   name in code and tests (checkout, offer, cancel, sync, webhook, manual
   payment, modal, loaders, e2e helpers, seeds, `prop-maps`). The drop of
   `asaas_net` and `installmentNetCents` lands here: the webhook's paid branch
   stops writing a net. Integration suites and the RLS suite green. Advisors
   run.
   This commit is big because a column rename cannot stay green split up.

8. **`feat(payment): translate Asaas webhooks into payment events`**
   Red: a unit table test for `readWebhook`, one row per Asaas event
   (`PAYMENT_CONFIRMED`/`RECEIVED`→paid, `OVERDUE`, `DELETED`→cancelled,
   `RESTORED`, `UPDATED` with the São Paulo due date, `REFUNDED` with and
   without a list, `PARTIALLY_REFUNDED`, `REFUND_IN_PROGRESS`, `REFUND_DENIED`
   with `additionalInfo.denialReason`, the chargeback alarms, unknown→ignored),
   plus a bad token (401), a missing token config (503), bad JSON and a bad body
   (400).

9. **`refactor(payment): apply webhook transitions from payment events`**
   `recordWebhookEvent` and `applyWebhookEvent` take a `PaymentEvent`, and the
   inbox writes `event` and `provider_plan_id`. `findPayment` matches on
   `chargeId`, then `planId`, then `reference`. The plan refund tally reads
   `event->'refunds'`. The route moves to `app/routes/api.payment-webhook.ts`
   at `/api/payment/webhook`: provider `readWebhook`, then record, then apply.
   The old route and file are removed. `register-webhook.ts` and
   `e2e/utils/payment-helpers.ts` point at the new URL. The webhook integration
   suite keeps its Asaas payloads and feeds them through the translator, so
   each existing scenario is still covered end to end.

10. **`feat(payment): name the provider in admin copy from the connector`**
    Loaders pass `providerName` and a ready-made `chargeDashboardUrl` in place
    of `asaasDashboardOrigin`. The copy becomes functions of the name:
    "Atualizar do Asaas", "Reembolsar no Asaas", "Em andamento no Asaas", the
    settings help text, the CPF note and the `kinds` label (`online: name`).
    The wording admins see stays the same. `app-settings` exposes
    `providerConfigured`. Component tests updated.

11. **`chore(lint): keep Asaas imports inside its connector`**
    `no-restricted-imports` in `eslint.config.js`: only
    `payment-provider.server.ts`, `provider/asaas/**` and `scripts/asaas/**` may
    import from `provider/asaas/*`. It fails if the domain reaches past the
    interface again.

12. **`docs(payment): describe the connector in the runbook and the design doc`**
    Covers the webhook URL, the column names and "swapping the provider means
    writing one connector". An ADR, `20260930-payments-go-through-a-provider-connector.md`,
    goes in `docs/architecture/decisions`.

Then: `pnpm lint`, `pnpm test`, `pnpm test:integration`, then **with your
go-ahead** `supabase db reset` and a single `pnpm test:e2e` run (after checking
the lock). Then I ask before opening the PR.

## Deliberately out of scope

- `ASAAS_*` env vars, `scripts/asaas/*` and `e2e/mocks/asaas-mock-server.ts`.
  They belong to the Asaas connector and stay named after it.
- E2E spec file names (`admin-asaas-payment.spec.ts`). They exercise the Asaas
  connector.
- Registering and configuring the production webhook. Proposed as its own
  ticket.
- No news item. Nothing changes for users.
