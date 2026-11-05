# The dual price is shown stacked, Pix first

- Status: accepted
- Date: 2026-10-08
- Tags: frontend, payments, ui

## Context

With card payments on, an event has two prices: the card price, which is the event price, and the Pix price, 10% lower (see [Prices are flat and Asaas owns the money](./20260929-prices-are-flat-and-asaas-owns-the-money.md)). Every place that shows a value has to show both without making either one ambiguous. A participant reading a Pix price next to a card price can wonder whether the discount is already applied.

## Decision

Every place that shows an event's value uses one treatment, `EventPrice` in `app/components/molecules/event-price/event-price.tsx`:

- **Two stacked lines.** Line 1 is the Pix price in bold, at body size and in the default color, followed by a small muted `no Pix · economize 10%`. Line 2 is the card price, small and muted: `R$ 140,18 no cartão`, without a strikethrough.
- **The discount sits on the Pix line**, framed as a saving. The card price right below it settles which number is discounted.
- With card payments off, the component shows the single event price.
- The Pix price comes from `pixPrice()`. The component does no price maths of its own.

## Consequences

### Positive

- Pix reads as the real price, the card is visible but quieter, and the discount is unambiguous.
- One component, so the cards on both dashboards and any later page stay consistent.

### Negative

- Two lines take more vertical space than one price on a card.

### Neutral

- The copy lives in `app/copy/payments.ts` (`dualPrice`), like all other site copy.

## Alternatives Considered

1. **The discount on the card line**
   - Cons: reads as a surcharge for the card rather than a saving for Pix.

2. **The card price struck through**
   - Cons: suggests the card price is no longer valid, when it is the event price.

3. **A large, brand-colored Pix price** (`text-2xl`)
   - Cons: too loud next to the rest of the card.

## References

- [Prices are flat and Asaas owns the money](./20260929-prices-are-flat-and-asaas-owns-the-money.md)
