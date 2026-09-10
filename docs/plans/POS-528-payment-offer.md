# POS-528 — Payment offer: the admin sends the charge, the participant gets the link — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An admin opens the payment modal, checks the amount, and clicks "Enviar cobrança". A charge opens, the participant is emailed the link, and the admin can copy the same thing as a WhatsApp message, resend it, re-price it, or call it off.

**Architecture:** `createPaymentOffer` is the one entry point. It cancels whatever charge was open, inserts a fresh `pending` row and nudges the funnel forward — all in one transaction — and only then talks to the outside: deleting the old Asaas charge, then sending the email. Nothing calls Asaas to *create* a charge yet; that happens when the participant picks an option (POS-529). While `PAYMENTS_ENABLED` is false the modal offers no charge at all.

**Tech Stack:** Kysely transactions, composable-functions, HTML string email templates, React with `useFetcher`, Vitest.

**Spec:** `docs/plans/payments-v3-design.md` §5.1, §5.6, §10 PR 9 — §5.1 and §7 were rewritten for this plan; read them, not the pre-2026-09-09 version.

**Branch:** `pos-528-payments-v3-pr-9-payment-offer-status-change-creates-the-row` (worktree already created).

**Depends on:** POS-525 (the modal and `handlePaymentIntent`), POS-526 (the Asaas client), POS-527 (`pricing.ts`). All merged.

---

## The trigger, and why it is not the status

The first version of this plan hung the charge off `application_status`
becoming `sent_payment_data`, from the detail form or a grid cell. That was
wrong twice over. `application_status` is the admin's funnel — a note about
where a conversation stands — and its enum (`pending`, `talking`,
`sent_payment_data`, `sent_rules`, `think_better`, `finalised`,
`no_response`) is read by the grid counters, the Listmonk filter and a 2025
migration. Money does not belong to it. And a grid cell is an absent-minded
click: re-picking a value the Radix select already holds would have deleted a
live Asaas charge and emailed a second link.

So: **the button in the modal is the only trigger.** The status select and the
grid go back to being labels — changing them moves no money and sends nothing.
The button moves the funnel forward as a courtesy, never backwards. Where the
money stands is answered where it has always been answered, by
`event_participant_payments` (`current_status`, `active_payment_id`,
`has_paid`).

Whether `sent_payment_data` should stay in the enum at all is a real question
and a separate ticket: retiring it means a migration, a backfill, and four
readers.

## What the codebase already gives us

- `app/business/payment/payment-intents.server.ts` — `handlePaymentIntent(intent, formData, createdBy)` answers every payment intent the modal posts, for both admin routes. New intents go **here**.
- `app/business/payment/pricing.ts` — `buildPaymentOptions(base, fees)`, `PaymentOption`. Pure, no `.server` suffix, so the browser can call it.
- `app/business/payment/asaas-fees.server.ts` — `getAsaasFees()`, cached, falls back to constants.
- `app/business/payment/asaas-client.server.ts` — `deleteAsaasPayment(id)`.
- `app/business/payment/payment-cancel.server.ts` — `cancelPayment({ paymentId })`, guarded on `ACTIVE_PAYMENT_STATUSES`.
- `app/copy/payments.ts` — `options.label(option)` already renders "Pix — R$ 221,99" and "Cartão 3x de …".
- `app/lib/helpers/format-currency.ts` — `reaisToCents` (reads `"150,55"` and `"150.55"`), `centsToReaisInput`.
- `app/test/setup.ts` stubs `navigator.clipboard`.
- The partial unique index `payments_one_active_per_participant` makes "cancel the old, insert the new" safe under concurrency.

Two constraints worth stating so nobody "fixes" them later:

- `payments_base_amount_check` is `>= 0` since `20260901143000_allow_a_payment_of_zero`, because a manual row can settle a staff spot that owed nothing. An **Asaas** offer still requires `> 0`: grossing up zero bills the participant the bare fee.
- Names follow design §7 — `createPaymentOffer`, `resendPaymentOffer`, `cancelActivePayment` all live in `payment-offer.server.ts`.

---

### Task 1: The WhatsApp message

**Files:**
- Modify: `app/copy/payments.ts`
- Test: `app/copy/payments.test.ts`

- [ ] **Step 1: Write the failing test** in `app/copy/payments.test.ts`

```ts
describe("paymentsCopy.whatsappMessage", () => {
  const input = {
    displayName: "Ana",
    eventTitle: "Festa de Setembro",
    paymentUrl: "https://www.positivparty.com/pagamento/abc",
    dueAt: "2026-09-01T12:00:00Z",
    options: [
      { id: "pix", method: "pix", installmentCount: null, perInstallment: 22199, total: 22199 },
      { id: "card_3", method: "credit_card", installmentCount: 3, perInstallment: 7818, total: 23454 },
    ],
  } as const

  it("names the person and the event", ...)          // "Ana", "Festa de Setembro"
  it("lists every option with its price", ...)       // "Pix — R$ 221,99", "Cartão 3x de R$ 78,18 (total R$ 234,54)"
  it("carries the link and the deadline", ...)       // the url, "01/09/2026"
})
```

- [ ] **Step 2: Run test to verify it fails** — `pnpm test:unit -- app/copy/payments.test.ts`
- [ ] **Step 3: Write minimal implementation** — a `whatsappMessage` entry on `paymentsCopy` joining greeting, link, one `options.label` line per option, and `formatDateTime(dueAt).date`. Plain text, no Markdown: this goes to WhatsApp, not through `Copy`.
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit** — `feat(payments): compose the WhatsApp message an admin copies`

---

### Task 2: The payment link email

**Files:**
- Create: `app/copy/emails/payment-link.ts`
- Create: `app/business/email/templates/payment-link-mail.template.ts` (+ `.test.ts`)
- Create: `app/business/email/format-payment-link-mail.ts`
- Create: `app/business/payment/payment-emails.server.ts` (+ `.test.ts`)
- Modify: `app/lib/paths.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// payment-link-mail.template.test.ts — input { displayName, eventTitle, eventEmoji, paymentUrl, dueAt, options }
it("lists every option with its price", ...)
it("links to the payment page and shows the due date", ...)
it("escapes anything the participant typed", ...)    // '<script>alert("x")</script>' → no "<script>"
it("refuses a payment url that is not http(s)", ...) // "javascript:alert(1)" → throws

// payment-emails.server.test.ts — sendEmail and getAsaasFees mocked
it("sends to the participant with the options priced from the base amount", ...)
it("answers { success: false } when the profile has no email", ...)
it("answers { success: false } and logs when the transport refuses", ...)
```

- [ ] **Step 2: Run tests to verify they fail** — `pnpm test:unit -- app/business/email app/business/payment/payment-emails.server.test.ts`
- [ ] **Step 3: Write minimal implementation**
  - Template: copy the shape of `application-mail.template.ts` — same head, same purple gradient, `sanitizeHtml` on every user-controlled value, a table of `paymentsCopy.options.label(option)` rows, a CTA button to `paymentUrl`, the due date through `formatDateTime`. Throw when `paymentUrl` does not start with `http://` or `https://`.
  - `format-payment-link-mail.ts` mirrors `format-application-mail.tsx`: build the HTML, `htmlToText` it, return `{ html, text }`.
  - `payment-emails.server.ts#sendPaymentLinkEmail({ paymentId })`: join `payments → event_participants → events → profiles`, `getAsaasFees()`, `buildPaymentOptions(base_amount, fees)`, url from `appOrigin(null) + paths.payment.PAYMENT(id)`, `sendEmail`, `logger.error` and `{ success: false }` on failure. **The module name and this export are load-bearing** — POS-530 and POS-531 add `sendPaymentConfirmedEmail` and `sendPaymentRefundEmail` beside them and mock this path.
  - Subject in `app/copy/emails/payment-link.ts`, not inline.
  - `app/lib/paths.ts` gains `payment: { PAYMENT: (id) => \`/pagamento/${id}\` }`. POS-529 Task 1 declares this group with `PAYMENT_THANKS` too and registers the routes; leave that half to it.
- [ ] **Step 4: Run tests to verify they pass**
- [ ] **Step 5: Commit** — `feat(payments): email the payment link with every option priced`

---

### Task 3: `createPaymentOffer`

**Files:**
- Create: `app/business/payment/payment-offer.server.ts`
- Test: `app/business/payment/payment-offer.integration.test.ts`
- Modify: `app/copy/payments.ts` (three error sentences)

- [ ] **Step 1: Write the failing test** — mock `./payment-emails.server`, `./asaas-client.server` (`deleteAsaasPayment` only) and `varlock/env`; fixtures from `createTestEvent` / `createTestProfile` / `createTestEventParticipant` / `createTestPayment`; wrap in `setupIntegrationTest` / `cleanupAfterTest`. Cases:

```
opens a charge for the ticket price and emails the link
  → one row: kind "asaas", status "pending", base_amount 22000, amount null, method null, due_at ≈ now + 7d, created_by set
uses a custom amount when the admin gives one
moves the funnel forward from talking                 → application_status becomes "sent_payment_data"
leaves a funnel step past it alone                    → "finalised" stays "finalised", "sent_rules" stays "sent_rules"
opens nothing for a social or staff spot              → failure, no row
refuses when there is no price and no custom amount   → failure, no row
refuses a base amount of zero
replaces the open charge instead of adding a second   → first "cancelled", second "pending" with the new amount
deletes the Asaas charge of the one it replaced       → deleteAsaasPayment("pay_old")
survives Asaas refusing the delete                    → old row cancelled, new row present
leaves a paid charge alone and refuses
does nothing but succeed when payments are switched off
keeps the charge when the email fails                 → success, emailSent false, row present
two concurrent offers → one wins                      → Promise.allSettled of two calls, exactly one active row
```

- [ ] **Step 2: Run test to verify it fails** — `pnpm test:integration -- app/business/payment/payment-offer.integration.test.ts`
- [ ] **Step 3: Write minimal implementation** — `applySchema` over `{ eventParticipantId: uuid, baseAmount: reais→cents nullish, createdBy: uuid nullish }`:
  1. Load the participant joined to its event (`spot_type`, `application_status`, `ticket_price`).
  2. `spot_type !== "regular"` → throw `paymentsCopy.errors.freeSpot`. The button is hidden for those spots, so reaching here is a bug or a hand-made request, not a flow.
  3. `!ENV.PAYMENTS_ENABLED` → `{ created: false, reason: "disabled" }`.
  4. No `baseAmount` and no `ticket_price`, or an amount `<= 0` → throw `paymentsCopy.errors.noAmount`.
  5. One transaction: refuse if a `paid`/`partially_refunded` row exists; cancel the `pending`/`awaiting_payment` rows returning `id, asaas_payment_id`; insert the new `pending` row with `due_at = now + 7d`; and `UPDATE event_participants SET application_status = 'sent_payment_data' WHERE id = ? AND application_status IN ('pending','talking')` — the `WHERE` is the whole "never backwards" rule.
  6. After the commit: `deleteAsaasPayment` per replaced row that had one, each in its own try/catch with `logger.error` — the row stays cancelled either way.
  7. `sendPaymentLinkEmail({ paymentId })`; return `{ created: true, paymentId, emailSent }`.

  Also in this file, both trivial and both named by design §7:
  - `resendPaymentOffer({ paymentId })` — the payment must still be active, then `sendPaymentLinkEmail`. No new row, no new due date.
  - `cancelActivePayment({ eventParticipantId })` — find the active row, hand it to `cancelPayment`. Used by Task 6.

  New sentences under `paymentsCopy.errors`: `participantNotFound`, `noAmount`, `alreadyPaid`, `freeSpot`, `notResendable`.
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit** — `feat(payments): open a charge when the admin sends it`

---

### Task 4: Cancelling a charge deletes it on Asaas

**Files:**
- Modify: `app/business/payment/payment-cancel.server.ts`
- Test: `app/business/payment/payment-cancel.integration.test.ts` (new — the function has no test of its own today)

- [ ] **Step 1: Write the failing test** — cancelling a row carrying an `asaas_payment_id` calls `deleteAsaasPayment`; a row without one does not; a delete that throws still leaves the row `cancelled`; a row that is not active is refused as before.
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Write minimal implementation** — return `asaas_payment_id` from the guarded UPDATE, then delete on Asaas in the same try/catch-and-log shape as `createPaymentOffer`. Drop the "POS-528 extends this" line from the doc comment.
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit** — `feat(payments): delete the Asaas charge when a charge is called off`

---

### Task 5: The modal sends, copies, resends and re-prices

**Files:**
- Modify: `app/components/organisms/payment/manage-payment-modal.tsx` (+ `.test.tsx`)
- Modify: `app/business/payment/payment-intents.server.ts`
- Modify: `app/business/admin/admin.server.ts` — `getEventParticipantBasic` also selects `events.ticket_price`
- Modify: `app/types/database/entities.types.ts` — `EventParticipantWithEvent` gains `event_ticket_price`
- Modify: `app/pages/admin/events/view-event-participant/view-event-participant.tsx` and `view-event-page.tsx` (loaders)
- Modify: `app/components/pages/admin/participants/participant-detail.tsx` (pass-through)
- Modify: `app/copy/payments.ts` (the section's labels)
- Tests: `manage-payment-modal.test.tsx`, both `*.action.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// manage-payment-modal.test.tsx
it("sends a charge for the ticket price by default", ...)      // intent "payment-offer", baseAmount "220"
it("sends the amount the admin typed instead", ...)
it("offers no charge when payments are switched off", ...)
it("offers no charge for a social or staff spot", ...)
it("re-prices an open charge", ...)                            // "Reenviar com outro valor" → same intent
it("confirms before replacing a charge the participant is paying", ...)  // active.status "awaiting_payment" → dialog
it("resends the email for the open charge", ...)               // intent "payment-resend", the payment id
it("copies the WhatsApp message for the open charge", ...)     // clipboard.writeText with the link and the options
```

```tsx
// view-event-participant.action.test.tsx / view-event-page.action.test.tsx
it("routes payment-offer through handlePaymentIntent", ...)
it("routes payment-resend through handlePaymentIntent", ...)
```

- [ ] **Step 2: Run tests to verify they fail** — `pnpm test:unit -- app/components/organisms/payment app/pages/admin/events`
- [ ] **Step 3: Write minimal implementation**
  - `handlePaymentIntent`: `payment-offer` → `createPaymentOffer({ ...values, createdBy })`; `payment-resend` → `resendPaymentOffer(values)`.
  - Modal: a **Cobrança** section above the manual form, rendered only when `paymentsEnabled && spotType === "regular"`. Amount field (`inputMode="decimal"`, not `type="number"` — same reason as the manual amount), defaulted to `centsToReaisInput(ticketPrice)`. With nothing open the button reads "Enviar cobrança"; with a charge open it reads "Reenviar com outro valor" and sits beside "Reenviar email" and "Copiar mensagem". An `awaiting_payment` row puts an `AlertDialog` in front of the replace, worded so the admin knows the participant already picked an option.
  - The message is built in the browser: `buildPaymentOptions(active.base_amount, fees)` and `${window.location.origin}${paths.payment.PAYMENT(active.id)}`. It has to run inside the click that asked for it — a server round trip first breaks `navigator.clipboard.writeText` in Safari.
  - New props: `paymentsEnabled`, `spotType`, `ticketPrice`, `eventTitle`, `fees`. Both loaders call `getAsaasFees()`; the detail page needs `event_ticket_price` added to `getEventParticipantBasic`; the grid page already has the event. POS-531 Task 2 builds on this component's `baseProps` — it will need the new props.
- [ ] **Step 4: Run tests to verify they pass**
- [ ] **Step 5: Commit** — `feat(payments): send, resend and re-price a charge from the modal`

---

### Task 6: Withdrawing cancels the charge

**Files:**
- Modify: `app/business/participant/cancel-application-to-event.server.ts`
- Test: `app/business/participant/cancel-application-to-event.integration.test.ts` (new)

- [ ] **Step 1: Write the failing test** — an open charge becomes `cancelled` when the participant withdraws; a `paid` one is left alone (a refund is a separate decision); a failure reaching Asaas does not stop the withdrawal.
- [ ] **Step 2: Run test to verify it fails** — `pnpm test:integration -- app/business/participant`
- [ ] **Step 3: Write minimal implementation** — after the `is_user_applied = false` update, call `cancelActivePayment({ eventParticipantId })`, swallowing and logging any failure. The person's cancellation goes through regardless.
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit** — `feat(payments): call off the charge when someone withdraws`

---

### Task 7: Full verification

- [ ] `pnpm lint` — green for the whole project
- [ ] `pnpm test` — green for the whole project
- [ ] Manually with `PAYMENTS_ENABLED=true`: open the modal on a `regular` participant → "Enviar cobrança" at the ticket price → a `pending` row appears, the funnel moves to "Dados de pagto enviados", Mailpit (<http://127.0.0.1:54324>) has the email listing PIX and cards 1x–6x → "Copiar mensagem" puts the text on the clipboard → "Reenviar com outro valor" cancels the first row and opens a second → "Cancelar cobrança" cancels it
- [ ] Manually: changing `application_status` by hand, in the form and in the grid, creates nothing and sends nothing
- [ ] Manually with `PAYMENTS_ENABLED=false`: the modal offers no charge, the manual form still works
- [ ] Check the database lock, then run E2E **once, last**: `pnpm test:e2e`

## Definition of done

- PR title: `[POS-528] Send the charge and email the payment link`
- `Fixes POS-528` in the description, every heading of the template filled in
- The design doc changes (§2 trigger row, §4 transition table, §5.1, §7, §10 PR 9) ship in this PR — POS-529…532 read it
- Delete this plan file before opening the PR
- No news item — participants cannot pay until POS-529 ships the page
- Open a follow-up ticket: should `sent_payment_data` stay in `application_status_enum`? Retiring it is a migration, a backfill, and four readers (grid counters, Listmonk filter modal, `20250708130907_approved_status.sql`, seeds)
