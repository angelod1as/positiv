# Payments go through a provider connector

- Status: accepted
- Date: 2026-09-30
- Tags: payments, architecture, data

## Context

Every call to Asaas already went through one HTTP client, but Asaas leaked into
the rest of the app: column names (`asaas_payment_id`, `asaas_installment_id`,
`asaas_customer_id`, `asaas_invoice_url`, `asaas_invoice_number`, `asaas_net`),
the `payment_kind` value `'asaas'`, webhook event names and payload shapes read
by the transitions and by SQL over the raw inbox, error codes, the dashboard
URL in the payment modal and the copy. Changing provider meant touching the
checkout, the refund reading, the webhook, the schema and the modal.

## Decision

**The payment domain talks to `PaymentProvider` and never to a provider's
API.** The interface (`app/business/payment/payment-provider.ts`) is ours:
find or create a customer, create a charge, cancel it, read its refunds, link
to it in the provider's dashboard, translate an error into a sentence, and read
a webhook delivery into our own `PaymentEvent` — amounts in cents, ids as
opaque strings, event types the domain names (paid, overdue, cancelled,
restored, updated, refunded, partially refunded, refund in progress, refund
denied, alarm, ignored).

- **Asaas is the one connector**, in `app/business/payment/provider/asaas/`.
  Everything that is true only of Asaas lives there: reais and cents, the
  São Paulo due date, the phone retry, `DONE`/`CANCELLED`, the event-name
  tables, the access-token check, `additionalInfo.denialReason`.
- **`paymentProvider()`** (`payment-provider.server.ts`) is the one place a
  connector is chosen. An ESLint `no-restricted-imports` block refuses any
  other import of the connector from `app/`, tests excepted.
- **The schema names the role, not the provider**: `provider_customer_id`,
  `provider_charge_id`, `provider_plan_id`, `provider_checkout_url`,
  `provider_dashboard_ref`, `provider_event_id`; `payment_kind` is
  `'online' | 'manual'`. `asaas_net` is dropped — the site stopped reading it
  when it stopped computing fees.
- **The inbox keeps both**: the raw `payload` for auditing, and `event`, the
  translated `PaymentEvent`, which is all the domain reads back.
- **The webhook URL is neutral**: `POST /api/payment/webhook`.
- **Copy takes the provider's name from the connector**, so admins still read
  "Reembolsar no Asaas" while no component names it.

## Consequences

### Positive

- Swapping providers means writing one connector and registering its webhook.
- Asaas's quirks are documented and tested in one directory, against its own
  payloads.
- The transitions are a switch over our own event types, readable without the
  Asaas docs open.

### Negative

- No `provider` column: every online row is assumed to belong to the current
  provider. A second provider running side by side would need one.
- Card prices on the payment page still split installments the way Asaas
  does (`splitInstallments` in `pricing.ts`), outside the connector.

### Neutral

- `ASAAS_*` variables, `scripts/asaas/*` and the e2e Asaas mock stay named
  after Asaas: they belong to its connector.
- Behaviour does not change: the same suites pass against the Asaas connector.

## Alternatives Considered

1. **Keep the Asaas names and only wrap the client**
   - Pros: no migration, no shared-database disruption.
   - Cons: the schema and the webhook would still speak Asaas, which is most of
     what a swap would have to change.

2. **Add a `provider` column now**
   - Pros: old rows stay tied to their provider after a swap.
   - Cons: nothing needs it yet; a clean cutover is the expected path.

## References

- POS-573 — Payment provider connector: keep Asaas out of the domain code
- POS-595 — register and configure the production webhook
- [A payment can be zero](./20260901-a-payment-can-be-zero.md)
