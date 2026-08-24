# POS-528 — Payment offer: the status change creates the charge and emails the link — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When an admin moves a participant to "Dados de pagto enviados", the system opens a charge, emails the payment link, and offers a WhatsApp message to copy. The admin can resend it, resend it for a different amount, or call it off.

**Architecture:** `createPaymentOffer` is the one entry point: it cancels whatever charge was open, inserts a fresh `pending` row inside a transaction, and only then talks to the outside — deleting the old Asaas charge and sending the email. Nothing calls Asaas to *create* a charge yet; that happens when the participant picks an option (POS-529). While `PAYMENTS_ENABLED` is false the status change is just a status change.

**Tech Stack:** Kysely transactions, composable-functions, HTML string email templates, React with `useFetcher`, Vitest.

**Spec:** `docs/plans/payments-v3-design.md` §5.1, §5.6, §10 PR 9.

**Branch:** `pos-528-payment-offer` from `main`, worktree `wt/pos-528-payment-offer`.

**Depends on:** POS-525 (the modal it extends), POS-526 (the Asaas client), POS-527 (the prices the email lists).

---

### Task 1: `createPaymentOffer`

**Files:**
- Create: `app/business/payment/payment-offer.server.ts`
- Test: `app/business/payment/payment-offer.integration.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanupAfterTest, setupIntegrationTest } from "~/test/integration-setup"
import {
  createTestEvent,
  createTestEventParticipant,
  createTestPayment,
  createTestProfile,
} from "~/test/db-test-utils"

const deleteAsaasPayment = vi.fn().mockResolvedValue(true)
vi.mock("./asaas-client.server", async () => {
  const actual = await vi.importActual<typeof import("./asaas-client.server")>(
    "./asaas-client.server",
  )
  return { ...actual, deleteAsaasPayment: (...args: unknown[]) => deleteAsaasPayment(...args) }
})

const sendPaymentLinkEmail = vi.fn().mockResolvedValue({ success: true })
vi.mock("./payment-emails.server", () => ({
  sendPaymentLinkEmail: (...args: unknown[]) => sendPaymentLinkEmail(...args),
}))

const paymentsEnabled = vi.hoisted(() => ({ value: true }))
vi.mock("varlock/env", () => ({
  ENV: {
    get PAYMENTS_ENABLED() {
      return paymentsEnabled.value
    },
    APP_URL: "https://www.positivparty.com",
    APP_ENV: "test",
  },
}))

import { createPaymentOffer } from "./payment-offer.server"

describe("createPaymentOffer", () => {
  const { tracker, kysely } = setupIntegrationTest()
  let eventId: string
  let participantId: string
  let socialParticipantId: string

  beforeEach(async () => {
    tracker.clear()
    paymentsEnabled.value = true
    deleteAsaasPayment.mockClear()
    sendPaymentLinkEmail.mockClear()

    const testId = Date.now()
    const event = await createTestEvent(tracker, kysely, {
      title: "Offer Event",
      ticket_price: 22000,
    })
    eventId = event.id

    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `test${testId}-offer@example.com`,
      full_name: "Offer Tester",
      cpf: "52998224725",
    })
    participantId = (
      await createTestEventParticipant(tracker, kysely, {
        event_id: eventId,
        profile_id: profile.id,
        spot_type: "regular",
      })
    ).id

    const social = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `test${testId}-social@example.com`,
      full_name: "Social Guest",
    })
    socialParticipantId = (
      await createTestEventParticipant(tracker, kysely, {
        event_id: eventId,
        profile_id: social.id,
        spot_type: "social",
      })
    ).id
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  async function paymentsFor(id: string) {
    const rows = await kysely
      .selectFrom("payments")
      .selectAll()
      .where("event_participant_id", "=", id)
      .orderBy("created_at", "asc")
      .execute()
    rows.forEach((row) => tracker.track("payments", row.id))
    return rows
  }

  it("opens a charge for the ticket price and emails the link", async () => {
    const result = await createPaymentOffer({ eventParticipantId: participantId })

    expect(result.success).toBe(true)

    const [payment] = await paymentsFor(participantId)
    expect(payment).toMatchObject({
      kind: "asaas",
      status: "pending",
      base_amount: 22000,
      amount: null,
      method: null,
    })
    expect(new Date(payment.due_at).getTime()).toBeGreaterThan(Date.now())
    expect(sendPaymentLinkEmail).toHaveBeenCalledTimes(1)
  })

  it("uses a custom amount when the admin gives one", async () => {
    await createPaymentOffer({ eventParticipantId: participantId, baseAmount: 11000 })

    const [payment] = await paymentsFor(participantId)
    expect(payment.base_amount).toBe(11000)
  })

  it("opens nothing for a social or staff spot", async () => {
    const result = await createPaymentOffer({ eventParticipantId: socialParticipantId })

    expect(result.success).toBe(true)
    expect(await paymentsFor(socialParticipantId)).toHaveLength(0)
    expect(sendPaymentLinkEmail).not.toHaveBeenCalled()
  })

  it("refuses when there is no price and no custom amount", async () => {
    const free = await createTestEvent(tracker, kysely, {
      title: "Free Event",
      ticket_price: null,
    })
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `test${Date.now()}-free@example.com`,
      full_name: "Free",
    })
    const participant = await createTestEventParticipant(tracker, kysely, {
      event_id: free.id,
      profile_id: profile.id,
    })

    const result = await createPaymentOffer({ eventParticipantId: participant.id })

    expect(result.success).toBe(false)
    expect(await paymentsFor(participant.id)).toHaveLength(0)
  })

  it("replaces the open charge instead of adding a second one", async () => {
    await createPaymentOffer({ eventParticipantId: participantId })
    await createPaymentOffer({ eventParticipantId: participantId, baseAmount: 15000 })

    const rows = await paymentsFor(participantId)
    expect(rows).toHaveLength(2)
    expect(rows[0].status).toBe("cancelled")
    expect(rows[1]).toMatchObject({ status: "pending", base_amount: 15000 })
  })

  it("deletes the Asaas charge of the one it replaced", async () => {
    await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "asaas",
      status: "awaiting_payment",
      amount: 23000,
      method: "pix",
      paid_at: null,
      asaas_payment_id: "pay_old",
    })

    await createPaymentOffer({ eventParticipantId: participantId })

    expect(deleteAsaasPayment).toHaveBeenCalledWith("pay_old")
  })

  it("leaves a paid charge alone and refuses", async () => {
    await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      amount: 22000,
    })

    const result = await createPaymentOffer({ eventParticipantId: participantId })

    expect(result.success).toBe(false)
    expect(deleteAsaasPayment).not.toHaveBeenCalled()
  })

  it("does nothing but succeed when payments are switched off", async () => {
    paymentsEnabled.value = false

    const result = await createPaymentOffer({ eventParticipantId: participantId })

    expect(result.success).toBe(true)
    expect(await paymentsFor(participantId)).toHaveLength(0)
    expect(sendPaymentLinkEmail).not.toHaveBeenCalled()
  })

  it("keeps the charge when the email fails", async () => {
    sendPaymentLinkEmail.mockResolvedValueOnce({ success: false })

    const result = await createPaymentOffer({ eventParticipantId: participantId })

    expect(result.success).toBe(true)
    if (result.success) expect(result.data.emailSent).toBe(false)
    expect(await paymentsFor(participantId)).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:integration -- app/business/payment/payment-offer.integration.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// app/business/payment/payment-offer.server.ts
import { applySchema } from "composable-functions"
import { ENV } from "varlock/env"
import { kyselyDb } from "~/kysely-db"
import { paymentsCopy } from "~/copy/payments"
import { zod } from "~/lib/helpers/zod"
import { logger } from "~/lib/logger/logger.server"
import { deleteAsaasPayment } from "./asaas-client.server"
import { sendPaymentLinkEmail } from "./payment-emails.server"

const OFFER_VALID_DAYS = 7

export const createPaymentOfferSchema = zod.object({
  eventParticipantId: zod.string().uuid(),
  baseAmount: zod.coerce.number().int().positive().nullish(),
})

/**
 * Opens the charge a participant is asked to pay.
 *
 * The database work is one transaction — cancel what was open, insert what
 * replaces it — so two admins clicking at once cannot leave two live charges;
 * the partial unique index makes the loser fail. Only after it commits does
 * anything reach the outside world, because an HTTP call inside a transaction
 * holds a row lock for as long as the network takes.
 */
export const createPaymentOffer = applySchema(createPaymentOfferSchema)(
  async (values) => {
    const participant = await kyselyDb
      .selectFrom("event_participants as ep")
      .innerJoin("events as e", "e.id", "ep.event_id")
      .select([
        "ep.id",
        "ep.spot_type",
        "ep.profile_id",
        "e.ticket_price",
        "e.title as event_title",
      ])
      .where("ep.id", "=", values.eventParticipantId)
      .executeTakeFirst()

    if (!participant) {
      throw new Error(paymentsCopy.errors.participantNotFound)
    }

    // A social or staff spot is free; there is nothing to charge.
    if (participant.spot_type !== "regular") {
      return { created: false as const, emailSent: false, reason: "free_spot" as const }
    }

    if (!ENV.PAYMENTS_ENABLED) {
      return { created: false as const, emailSent: false, reason: "disabled" as const }
    }

    const baseAmount = values.baseAmount ?? participant.ticket_price
    if (!baseAmount || baseAmount <= 0) {
      throw new Error(paymentsCopy.errors.noAmount)
    }

    const dueAt = new Date(Date.now() + OFFER_VALID_DAYS * 24 * 60 * 60 * 1000).toISOString()

    const { replaced, payment } = await kyselyDb.transaction().execute(async (trx) => {
      const paid = await trx
        .selectFrom("payments")
        .select("id")
        .where("event_participant_id", "=", values.eventParticipantId)
        .where("status", "in", ["paid", "partially_refunded"])
        .executeTakeFirst()

      if (paid) {
        throw new Error(paymentsCopy.errors.alreadyPaid)
      }

      const replaced = await trx
        .updateTable("payments")
        .set({ status: "cancelled" })
        .where("event_participant_id", "=", values.eventParticipantId)
        .where("status", "in", ["pending", "awaiting_payment"])
        .returning(["id", "asaas_payment_id"])
        .execute()

      const payment = await trx
        .insertInto("payments")
        .values({
          event_participant_id: values.eventParticipantId,
          kind: "asaas",
          status: "pending",
          base_amount: baseAmount,
          due_at: dueAt,
        })
        .returningAll()
        .executeTakeFirstOrThrow()

      return { replaced, payment }
    })

    // Outside the transaction: the charge is ours either way, and a failure
    // here must not undo the row the admin just created.
    for (const old of replaced) {
      if (!old.asaas_payment_id) continue
      try {
        await deleteAsaasPayment(old.asaas_payment_id)
      } catch (error) {
        logger.error("Could not delete the replaced Asaas charge", {
          paymentId: old.id,
          asaasPaymentId: old.asaas_payment_id,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    const email = await sendPaymentLinkEmail({ paymentId: payment.id })

    return {
      created: true as const,
      paymentId: payment.id,
      emailSent: email.success,
    }
  },
)
```

Add to `app/copy/payments.ts` under `errors`:

```ts
    participantNotFound: "Participante não encontrada.",
    noAmount: "Defina um valor: este evento não tem preço cadastrado.",
    alreadyPaid: "Esta pessoa já pagou. Cancele ou reembolse antes de cobrar de novo.",
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:integration -- app/business/payment/payment-offer.integration.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/business/payment/payment-offer.server.ts app/business/payment/payment-offer.integration.test.ts app/copy/payments.ts
git commit -m "feat(payments): open a charge when the admin sends the payment data"
```

---

### Task 2: The payment link email

**Files:**
- Create: `app/copy/emails/payment-link.ts`
- Create: `app/business/email/templates/payment-link-mail.template.ts`
- Create: `app/business/email/format-payment-link-mail.ts`
- Create: `app/business/payment/payment-emails.server.ts`
- Tests: `payment-link-mail.template.test.ts`, `payment-emails.server.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// app/business/email/templates/payment-link-mail.template.test.ts
import { describe, expect, it } from "vitest"
import { paymentLinkMailTemplate } from "./payment-link-mail.template"

const base = {
  displayName: "Ana",
  eventTitle: "Festa de Setembro",
  eventEmoji: "🎉",
  paymentUrl: "https://www.positivparty.com/pagamento/abc",
  dueAt: "2026-09-01T12:00:00Z",
  options: [
    { id: "pix", method: "pix", installmentCount: null, perInstallment: 22199, total: 22199 },
    { id: "card_3", method: "credit_card", installmentCount: 3, perInstallment: 7818, total: 23454 },
  ],
}

describe("paymentLinkMailTemplate", () => {
  it("lists every option with its price", () => {
    const html = paymentLinkMailTemplate(base as never)

    expect(html).toContain("Pix — R$ 221,99")
    expect(html).toContain("Cartão 3x de R$ 78,18 (total R$ 234,54)")
  })

  it("links to the payment page and shows the due date", () => {
    const html = paymentLinkMailTemplate(base as never)

    expect(html).toContain("https://www.positivparty.com/pagamento/abc")
    expect(html).toContain("01/09/2026")
  })

  it("escapes anything the participant typed", () => {
    const html = paymentLinkMailTemplate({
      ...base,
      displayName: '<script>alert("x")</script>',
    } as never)

    expect(html).not.toContain("<script>")
  })

  it("refuses a payment url that is not http(s)", () => {
    expect(() =>
      paymentLinkMailTemplate({ ...base, paymentUrl: "javascript:alert(1)" } as never),
    ).toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- app/business/email/templates/payment-link-mail.template.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Copy the shape of `application-mail.template.ts` — same head, same purple styling, same `sanitizeHtml` on every user-controlled value. The body carries: a greeting with the display name, the event, a table of options built from `paymentsCopy.options.label(option)` (POS-527), a CTA button to `paymentUrl`, and the due date through `formatDateTime`. Throw when `paymentUrl` does not start with `http://` or `https://`.

`format-payment-link-mail.ts` mirrors `format-application-mail.tsx`: build the HTML, `htmlToText` it, return `{ html, text }`.

`payment-emails.server.ts` loads what the template needs and sends it:

```ts
export async function sendPaymentLinkEmail({ paymentId }: { paymentId: string }) {
  const payment = await kyselyDb
    .selectFrom("payments as p")
    .innerJoin("event_participants as ep", "ep.id", "p.event_participant_id")
    .innerJoin("events as e", "e.id", "ep.event_id")
    .innerJoin("profiles as pr", "pr.id", "ep.profile_id")
    .select([
      "p.id", "p.base_amount", "p.due_at",
      "e.title as event_title", "e.emoji as event_emoji",
      "pr.email", "pr.full_name", "pr.social_name",
    ])
    .where("p.id", "=", paymentId)
    .executeTakeFirst()

  if (!payment?.email) return { success: false }

  const fees = await getAsaasFees()
  const options = buildPaymentOptions(payment.base_amount, fees)
  const paymentUrl = `${appOrigin(null)}${paths.payment.PAYMENT(payment.id)}`

  const { html, text } = await formatPaymentLinkMail({ ...payment, options, paymentUrl })

  const result = await sendEmail({
    to: payment.email,
    subject: paymentLinkMailCopy.subject(payment.event_emoji, payment.event_title),
    html,
    text,
  })

  if (!result.success) {
    logger.error("Could not send the payment link email", { paymentId })
  }
  return { success: result.success }
}
```

`paths.payment.PAYMENT(id)` is added in POS-529; declare it here as `/pagamento/${id}` in `app/lib/paths.ts` if this PR lands first.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- app/business/email`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/business/email app/business/payment/payment-emails.server.ts app/copy/emails/payment-link.ts app/lib/paths.ts
git commit -m "feat(payments): email the payment link with every option priced"
```

---

### Task 3: The WhatsApp message

**Files:**
- Modify: `app/copy/payments.ts`
- Test: `app/copy/payments.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
describe("paymentsCopy.whatsappMessage", () => {
  it("names the event, lists the options and carries the link and the deadline", () => {
    const message = paymentsCopy.whatsappMessage({
      displayName: "Ana",
      eventTitle: "Festa de Setembro",
      paymentUrl: "https://www.positivparty.com/pagamento/abc",
      dueAt: new Date("2026-09-01T12:00:00Z"),
      options: [
        { id: "pix", method: "pix", installmentCount: null, perInstallment: 22199, total: 22199 },
        { id: "card_3", method: "credit_card", installmentCount: 3, perInstallment: 7818, total: 23454 },
      ],
    })

    expect(message).toContain("Ana")
    expect(message).toContain("Festa de Setembro")
    expect(message).toContain("Pix — R$ 221,99")
    expect(message).toContain("Cartão 3x de R$ 78,18 (total R$ 234,54)")
    expect(message).toContain("https://www.positivparty.com/pagamento/abc")
    expect(message).toContain("01/09/2026")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- app/copy/payments.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

```ts
  whatsappMessage: (input: {
    displayName: string
    eventTitle: string
    paymentUrl: string
    dueAt: Date
    options: PaymentOption[]
  }) =>
    [
      `Oi, ${input.displayName}! Aqui está o link para pagar a ${input.eventTitle}:`,
      "",
      input.paymentUrl,
      "",
      "Formas de pagamento:",
      ...input.options.map((option) => `• ${paymentsCopy.options.label(option)}`),
      "",
      `O link vale até ${formatDateTime(input.dueAt.toISOString()).date}.`,
    ].join("\n"),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- app/copy/payments.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/copy/payments.ts app/copy/payments.test.ts
git commit -m "feat(payments): compose the WhatsApp message an admin copies"
```

---

### Task 4: Wire the status change and the modal actions

**Files:**
- Modify: `app/pages/admin/events/view-event-participant/view-event-participant.tsx`
- Modify: `app/pages/admin/events/view-event-page/view-event-page.tsx`
- Modify: `app/components/pages/admin/participants/participant-vs-event-data.tsx` (the "Valor a cobrar" field)
- Modify: `app/components/organisms/payment/manage-payment-modal.tsx` (copy, resend, cancel)
- Modify: `app/business/payment/payment-cancel.server.ts` (delete on Asaas too)
- Tests: the matching test files

- [ ] **Step 1: Write the failing test**

```tsx
  it("opens a charge when the status becomes sent_payment_data", async () => {
    await action(
      requestWith({
        intent: "update-event-participant",
        id: "ep-1",
        profile_id: "p-1",
        application_status: "sent_payment_data",
      }),
    )

    expect(createPaymentOffer).toHaveBeenCalledWith(
      expect.objectContaining({ eventParticipantId: "ep-1" }),
    )
  })

  it("passes the amount the admin typed", async () => {
    await action(
      requestWith({
        intent: "update-event-participant",
        id: "ep-1",
        profile_id: "p-1",
        application_status: "sent_payment_data",
        charge_amount: "150",
      }),
    )

    expect(createPaymentOffer).toHaveBeenCalledWith(
      expect.objectContaining({ baseAmount: 15000 }),
    )
  })

  it("opens nothing for any other status", async () => {
    await action(
      requestWith({
        intent: "update-event-participant",
        id: "ep-1",
        profile_id: "p-1",
        application_status: "talking",
      }),
    )

    expect(createPaymentOffer).not.toHaveBeenCalled()
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- app/pages/admin/events`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

In both actions, after `update-event-participant` succeeds:

```ts
  if (intent === "update-event-participant") {
    const result = await updateEventParticipantById(Object.fromEntries(formData))
    if (!result.success) return { success: false, intent, errors: result.errors }

    let offer: Awaited<ReturnType<typeof createPaymentOffer>> | null = null
    if (formData.get("application_status") === "sent_payment_data") {
      const rawAmount = formData.get("charge_amount")
      offer = await createPaymentOffer({
        eventParticipantId: String(formData.get("id")),
        baseAmount: rawAmount ? reaisToCents(String(rawAmount)) : null,
      })
    }

    return {
      success: true,
      intent,
      paymentOffer: offer?.success ? offer.data : null,
      paymentError: offer && !offer.success ? offer.errors[0]?.message : null,
    }
  }
```

Add the two new intents:

```ts
  if (intent === "payment-resend") {
    const rawAmount = formData.get("baseAmount")
    const result = await createPaymentOffer({
      eventParticipantId: String(formData.get("eventParticipantId")),
      baseAmount: rawAmount ? reaisToCents(String(rawAmount)) : null,
    })
    return { success: result.success, intent, errors: result.success ? undefined : result.errors }
  }
```

`payment-cancel` already exists from POS-525; extend `cancelPayment` to delete the Asaas charge after the guarded UPDATE returns a row, with the same try/catch-and-log as `createPaymentOffer`.

In `participant-vs-event-data.tsx`, add a "Valor a cobrar" text field next to the status select, defaulting to the event's `ticket_price` in reais, shown only when the selected status is `sent_payment_data`, submitted as `charge_amount`.

In the modal, add **Copiar mensagem** (writes `paymentsCopy.whatsappMessage(...)` to the clipboard — `navigator.clipboard.writeText` is already stubbed in `app/test/setup.ts`), **Reenviar email**, **Reenviar com outro valor** (a small amount field beside it), all posting `payment-resend`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- app/pages/admin app/components/organisms/payment`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/pages/admin app/components app/business/payment/payment-cancel.server.ts
git commit -m "feat(payments): create the charge from the status change and let admins resend it"
```

---

### Task 5: Withdrawing cancels the charge

**Files:**
- Modify: `app/business/participant/cancel-application.server.ts` (find the exact path with `grep -rn "cancelApplicationToEvent" app/business`)
- Test: its integration test

- [ ] **Step 1: Write the failing test**

```ts
  it("cancels the open charge when the participant withdraws", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participant.id,
      kind: "asaas",
      status: "pending",
      amount: null,
      method: null,
      paid_at: null,
    })

    await cancelApplicationToEvent({ eventId: event.id, profileId: profile.id })

    const after = await kysely
      .selectFrom("payments")
      .select("status")
      .where("id", "=", payment.id)
      .executeTakeFirstOrThrow()

    expect(after.status).toBe("cancelled")
  })

  it("leaves a paid charge alone — a refund is a separate decision", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participant.id,
      amount: 22000,
    })

    await cancelApplicationToEvent({ eventId: event.id, profileId: profile.id })

    const after = await kysely
      .selectFrom("payments")
      .select("status")
      .where("id", "=", payment.id)
      .executeTakeFirstOrThrow()

    expect(after.status).toBe("paid")
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:integration -- app/business/participant`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

After the existing update that sets `is_user_applied = false`, find the participant's open payment and call `cancelPayment` on it. Wrap it so a failure to reach Asaas does not stop the withdrawal — the person's cancellation must go through regardless.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:integration -- app/business/participant`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/business/participant
git commit -m "feat(payments): call off the charge when someone withdraws"
```

---

### Task 6: Full verification

- [ ] Run: `pnpm lint`, `pnpm test` — green
- [ ] Manually with `PAYMENTS_ENABLED=true` in `.env`: move a participant to "Dados de pagto enviados" → a `pending` row appears, Mailpit (127.0.0.1:54324) has the email listing PIX and cards 1x–6x → "Copiar mensagem" puts the text on the clipboard → "Reenviar com outro valor" cancels the first row and opens a second
- [ ] Manually with `PAYMENTS_ENABLED=false`: the same status change creates nothing and sends nothing
- [ ] Run E2E **once, last**: `pnpm test:e2e`

## Definition of done

- PR title: `[POS-528] Open the charge and send the payment link`
- `Fixes POS-528`
- Delete this plan file before opening the PR
- No news item yet — participants cannot pay until POS-529
