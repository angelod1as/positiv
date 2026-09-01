# A payment can be zero

- Status: accepted
- Date: 2026-09-01
- Tags: payments, data

## Context

`payments` refuses a zero: `base_amount integer NOT NULL CHECK (base_amount > 0)`, and a
`paid` row is required to carry an `amount`. The table was designed around an Asaas charge,
where zero never happens.

Two kinds of participant do not fit that shape.

**Staff and social spots pay nothing.** They attend, and as far as the admin is concerned
they are settled — there is no outstanding charge and nobody is chasing them. The true
amount is zero.

**Most of the history has no amount at all.** Before the site recorded one, a participation
was marked paid with a checkbox and the price lived in somebody's memory. The ticket price
moved a lot over the years and those numbers are not recoverable. The first event with any
amount recorded is **Corpus Peladus, 2025-06-21** (39 amounts across 71 participants). The
sixteen events before it — "A Primeira" on 2023-02-25 through "MaiOral" on 2025-05-17 —
carry 605 participations marked as paid and not one cent written down.

Because zero was forbidden, `20260827143204_backfill_payments.sql` had to put something in
the column, and used the event's ticket price. That invented money: 721 participations got
an amount nobody ever recorded, R$ 125.850,00 in total, and 53 staff spots that paid nothing
now read as R$ 11.100,00. The admin screens report R$ 235.362,00 where the amounts we can
actually vouch for add up to R$ 109.512,00.

## Decision

**A payment may be zero.** `base_amount` and `amount` accept `0`, and a `paid` row carrying
zero means the participation is settled and no money is owed.

That gives each fact its own field, and lets the ledger answer the two questions separately:

- **Who paid?** — the payer count includes zero-amount rows. A staff spot is a settled
  participation; so is a 2023 participation whose price is lost. Deleting those rows would
  answer "200 people paid" for an event where 300 did.
- **How much came in?** — only amounts we can vouch for are summed. A prediction dressed as
  a record is worse than a gap, because nothing downstream can tell it apart from a fact.

The 721 backfilled amounts are set to zero. Nothing is lost by that: `spot_type` already
says which participations are staff or social, so a zero there is a courtesy, and a zero on
a regular spot is an amount nobody wrote down. The row's `note = 'backfill'` narrows it
further, to the exact rows this decision zeroed.

Revenue before 2025-06-21 is therefore a floor, not a total, and no report should present it
as one.

## Consequences

### Positive

- Staff and social spots are finally expressible: settled, zero, no invented revenue.
- Every number on an admin screen is one somebody recorded. R$ 109.512,00 that is true
  beats R$ 235.362,00 that is not.
- The payer count stays honest across the whole history, including the years without amounts.
- `spot_type` already separates a courtesy from a lost amount, and `note = 'backfill'`
  pins down the rows this decision zeroed, so a later report can split them without guessing.

### Negative

- `R$ 0,00` reads the same in both cases on screen. The row says which is which through
  `spot_type`, but a total that mixes staff spots with lost amounts hides the difference,
  so any report breaking revenue down owes the reader that split.
- Per-event revenue is not comparable across the 2025-06-21 line. Any chart spanning it is
  showing two different things and needs to say so.
- Every future writer of `payments` has to mean it: the CHECK no longer catches a zero that
  arrived by accident, from an unparsed form field or a failed conversion.
- Restating the history later, if the numbers ever turn up, means telling those zeros apart
  from the real ones — which is what the note is for.
