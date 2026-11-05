# Prices are flat and Asaas owns the money

- Status: accepted
- Date: 2026-09-29
- Tags: payments, architecture

## Context

The first online-payments design passed Asaas's fees on to the participant: the site grossed the event price up per method and per installment count, read a fee table, stored a `fee_snapshot` and tracked anticipation. That produced odd per-installment prices, and it depended on an anticipation formula the sandbox cannot simulate and nobody could verify.

Later, on POS-646, a page computed the per-installment figure itself with `Math.ceil` and quoted R$ 36,67 while Asaas charged R$ 36,66 and put the remainder on the last installment. Any money figure the site works out on its own drifts from the real charge sooner or later.

## Decision

**Prices are flat** (POS-577):

- Online payments on and card on: card is the event price, in 1x to 6x, no interest. Pix is the event price minus 10% (`PIX_DISCOUNT_PERCENT`, `pixPrice()` in `app/business/payment/pricing.ts`).
- Card off, or online payments off: the full event price.
- Positiv absorbs every fee. The site does no fee maths and does not track anticipation.

**Asaas owns the money**:

- The site decides the price and records what the participant paid and what was refunded. Fees, anticipation and net amounts are read in Asaas, never on the site.
- Every money figure shown to a participant, on a page or in an email, comes from the `PaymentProvider` connector (`splitInstallments`, the charge data) or from Asaas itself. No template or component does its own arithmetic on an amount.
- Amounts are integer cents everywhere; the connector converts to reais at the API boundary. A card plan sends `totalValue` and `installmentCount`, and Asaas puts the remainder on the last installment.
- Refunds are made in the Asaas dashboard, through "Reembolsar no Asaas". The site records them from webhooks and from "Atualizar do Asaas", and only a `DONE` refund counts.

## Consequences

### Positive

- One price per method, the same on every page, in every email and on the Asaas invoice.
- No fee table, gross-up or anticipation formula to calibrate or keep current.
- A figure that disagrees with Asaas is a bug in one place, the connector.

### Negative

- Positiv pays the fees, including anticipation on card plans, out of the event price.
- Questions about fees or net amounts are answered in the Asaas dashboard, not on the site.

### Neutral

- Asaas's automatic anticipation stays on. Its fee lives on the anticipation object, not in the charge's `netValue`, and it is Asaas's concern.

## Alternatives Considered

1. **Pass the fees on to the participant** (the payments v3 design)
   - Pros: Positiv receives the full event price.
   - Cons: odd installment prices, and it depends on an anticipation formula nobody could verify.

2. **Let the site compute installment figures**
   - Pros: no call to the connector to render a price.
   - Cons: rounding drifts from what Asaas charges, as POS-646 showed.

## References

- POS-577 — flat prices: card at the event price, Pix 10% off, Positiv absorbs fees
- POS-646 — installment figures come from Asaas
- [Payments go through a provider connector](./20260930-payments-go-through-a-provider-connector.md)
- [The dual price is shown stacked, Pix first](./20261008-the-dual-price-is-shown-stacked-pix-first.md)
- `docs/plans/payments-v3-design.md`, whose fee sections this supersedes
