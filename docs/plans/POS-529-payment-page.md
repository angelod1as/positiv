# POS-529 — The participant's payment page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The participant opens the link, sees what each way of paying costs, picks one, and lands on the Asaas checkout. The charge is created at that moment and not before.

**Architecture:** Two routes under the private layout. The loader answers one of four states (needs CPF, ready, already paid, no longer open); the action creates the Asaas customer once per person, creates the charge, records it with a guarded UPDATE, and redirects to `invoiceUrl`. If the database write loses a race, the charge just created is deleted — a charge nobody can reach is worse than no charge.

**Tech Stack:** React Router v7 loaders/actions, Kysely, zod v4, the form runtime for the CPF step, Vitest.

**Spec:** `docs/plans/payments-v3-design.md` §5.2, §10 PR 10.

**Branch:** `pos-529-payment-page` from `main`, worktree `wt/pos-529-payment-page`.

**Depends on:** POS-528.

---

### Task 1: Routes and paths

**Files:**
- Modify: `app/lib/paths.ts`
- Modify: `app/routes.ts`
- Create: `app/pages/payment/payment-page.tsx`, `app/pages/payment/payment-thanks-page.tsx`

- [ ] **Step 1: Add the paths**

In `app/lib/paths.ts`, alongside the existing groups:

```ts
  payment: {
    PAYMENT: (paymentId: string) => `/pagamento/${paymentId}`,
    PAYMENT_THANKS: (paymentId: string) => `/pagamento/${paymentId}/obrigado`,
  },
```

- [ ] **Step 2: Register the routes**

In `app/routes.ts`, inside `layout("pages/guard/private.tsx", [...])` — the payer must be logged in:

```ts
    route("/pagamento/:paymentId", "pages/payment/payment-page.tsx"),
    route("/pagamento/:paymentId/obrigado", "pages/payment/payment-thanks-page.tsx"),
```

- [ ] **Step 3: Type-check**

Run: `pnpm lint`
Expected: fails until the two files exist — create them as stubs returning `null`, then re-run; clean.

- [ ] **Step 4: Commit**

```bash
git add app/lib/paths.ts app/routes.ts app/pages/payment
git commit -m "feat(payments): register the payment routes"
```

---

### Task 2: The loader and its four states

**Files:**
- Create: `app/pages/payment/payment-page.server.ts`
- Test: `app/pages/payment/payment-page.server.integration.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { cleanupAfterTest, setupIntegrationTest } from "~/test/integration-setup"
import {
  createTestEvent,
  createTestEventParticipant,
  createTestPayment,
  createTestProfile,
} from "~/test/db-test-utils"
import { loadPaymentPage } from "./payment-page.server"

describe("loadPaymentPage", () => {
  const { tracker, kysely } = setupIntegrationTest()
  let profileId: string
  let otherProfileId: string
  let participantId: string

  beforeEach(async () => {
    tracker.clear()
    const testId = Date.now()
    const event = await createTestEvent(tracker, kysely, {
      title: "Payment Page Event",
      ticket_price: 22000,
    })
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `test${testId}-payer@example.com`,
      full_name: "Ana Souza",
      cpf: "529.982.247-25",
    })
    const other = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `test${testId}-other@example.com`,
      full_name: "Someone Else",
    })
    profileId = profile.id
    otherProfileId = other.id
    participantId = (
      await createTestEventParticipant(tracker, kysely, {
        event_id: event.id,
        profile_id: profile.id,
      })
    ).id
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  async function openCharge() {
    return createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "asaas",
      status: "pending",
      amount: null,
      method: null,
      paid_at: null,
      base_amount: 22000,
    })
  }

  it("offers the options to the person the charge belongs to", async () => {
    const payment = await openCharge()

    const result = await loadPaymentPage({ paymentId: payment.id, profileId })

    expect(result.state).toBe("ready")
    if (result.state === "ready") {
      expect(result.options.map((o) => o.id)).toEqual([
        "pix", "card_1", "card_2", "card_3", "card_4", "card_5", "card_6",
      ])
      expect(result.eventTitle).toBe("Payment Page Event")
    }
  })

  it("refuses someone else's charge", async () => {
    const payment = await openCharge()

    await expect(
      loadPaymentPage({ paymentId: payment.id, profileId: otherProfileId }),
    ).rejects.toBeDefined()
  })

  it("asks for the CPF when the profile has none that checks out", async () => {
    await kysely
      .updateTable("profiles")
      .set({ cpf: "111.111.111-11" })
      .where("id", "=", profileId)
      .execute()
    const payment = await openCharge()

    const result = await loadPaymentPage({ paymentId: payment.id, profileId })

    expect(result.state).toBe("needs_cpf")
  })

  it("says it is already paid", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      amount: 22000,
    })

    const result = await loadPaymentPage({ paymentId: payment.id, profileId })

    expect(result.state).toBe("paid")
  })

  it("says the link is closed for an expired or cancelled charge", async () => {
    const expired = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "asaas",
      status: "expired",
      amount: null,
      method: null,
      paid_at: null,
    })

    const result = await loadPaymentPage({ paymentId: expired.id, profileId })

    expect(result.state).toBe("closed")
  })

  it("keeps offering the options after the participant already picked one", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "asaas",
      status: "awaiting_payment",
      amount: 22199,
      method: "pix",
      paid_at: null,
      asaas_invoice_url: "https://sandbox.asaas.com/i/pay_1",
    })

    const result = await loadPaymentPage({ paymentId: payment.id, profileId })

    expect(result.state).toBe("ready")
    if (result.state === "ready") {
      expect(result.chosen?.id).toBe("pix")
      expect(result.invoiceUrl).toBe("https://sandbox.asaas.com/i/pay_1")
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:integration -- app/pages/payment`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// app/pages/payment/payment-page.server.ts
import { redirectWithError } from "remix-toast"
import { kyselyDb } from "~/kysely-db"
import { buildPaymentOptions, type PaymentOption } from "~/business/payment/pricing"
import { getAsaasFees } from "~/business/payment/asaas-fees.server"
import { isValidCpf } from "~/business/payment/cpf"
import { paymentsCopy } from "~/copy/payments"
import paths from "~/lib/paths"

export type PaymentPageData =
  | { state: "needs_cpf"; paymentId: string; eventTitle: string }
  | {
      state: "ready"
      paymentId: string
      eventTitle: string
      eventEmoji: string | null
      dueAt: string
      options: PaymentOption[]
      chosen: PaymentOption | null
      invoiceUrl: string | null
    }
  | { state: "paid"; eventTitle: string; amount: number; paidAt: string }
  | { state: "closed"; eventTitle: string }

export async function loadPaymentPage({
  paymentId,
  profileId,
}: {
  paymentId: string
  profileId: string
}): Promise<PaymentPageData> {
  const payment = await kyselyDb
    .selectFrom("payments as p")
    .innerJoin("event_participants as ep", "ep.id", "p.event_participant_id")
    .innerJoin("events as e", "e.id", "ep.event_id")
    .innerJoin("profiles as pr", "pr.id", "ep.profile_id")
    .select([
      "p.id", "p.status", "p.base_amount", "p.amount", "p.method",
      "p.installment_count", "p.due_at", "p.paid_at", "p.asaas_invoice_url",
      "e.title as event_title", "e.emoji as event_emoji",
      "pr.id as profile_id", "pr.cpf",
    ])
    .where("p.id", "=", paymentId)
    .executeTakeFirst()

  // Same answer for "does not exist" and "is not yours": the id is a UUID, and
  // telling the two apart would confirm that a guessed one is real.
  if (!payment || payment.profile_id !== profileId) {
    throw await redirectWithError(paths.dash.DASHBOARD, paymentsCopy.page.notYours)
  }

  if (payment.status === "paid" || payment.status === "partially_refunded") {
    return {
      state: "paid",
      eventTitle: payment.event_title ?? "",
      amount: payment.amount ?? 0,
      paidAt: payment.paid_at ?? "",
    }
  }

  if (payment.status !== "pending" && payment.status !== "awaiting_payment") {
    return { state: "closed", eventTitle: payment.event_title ?? "" }
  }

  if (!isValidCpf(payment.cpf)) {
    return {
      state: "needs_cpf",
      paymentId: payment.id,
      eventTitle: payment.event_title ?? "",
    }
  }

  const options = buildPaymentOptions(payment.base_amount, await getAsaasFees())
  const chosen =
    payment.method === "pix"
      ? (options.find((option) => option.id === "pix") ?? null)
      : payment.method === "credit_card" && payment.installment_count
        ? (options.find((o) => o.installmentCount === payment.installment_count) ?? null)
        : null

  return {
    state: "ready",
    paymentId: payment.id,
    eventTitle: payment.event_title ?? "",
    eventEmoji: payment.event_emoji,
    dueAt: payment.due_at,
    options,
    chosen,
    invoiceUrl: payment.asaas_invoice_url,
  }
}
```

Add the page copy to `app/copy/payments.ts`:

```ts
  page: {
    title: "Pagamento",
    notYours: "Este link de pagamento não é seu.",
    chooseOption: "Como você quer pagar?",
    pay: "Pagar",
    dueAt: (date: string) => `Este link vale até ${date}.`,
    paidTitle: "Pagamento confirmado",
    paidBody: (amount: string, date: string) =>
      `Recebemos ${amount} em ${date}. Nada mais a fazer.`,
    closedTitle: "Este link não está mais disponível",
    closedBody:
      "A cobrança foi cancelada ou expirou. Fale com a organização para receber um novo link.",
    cpfTitle: "Precisamos do seu CPF",
    cpfBody: "O pagamento é processado pelo Asaas, que exige o CPF de quem paga.",
    cpfLabel: "CPF",
    cpfInvalid: "Esse CPF não confere. Confira os números.",
    cpfSubmit: "Salvar e continuar",
    thanksTitle: "Recebemos sua escolha",
    thanksBody:
      "Assim que o pagamento for confirmado você recebe um email. Isso é imediato no Pix e pode levar alguns minutos no cartão.",
    thanksPaidBody: "Pagamento confirmado. Até lá!",
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:integration -- app/pages/payment`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/pages/payment/payment-page.server.ts app/pages/payment/payment-page.server.integration.test.ts app/copy/payments.ts
git commit -m "feat(payments): decide what the payment page shows"
```

---

### Task 3: Picking an option creates the charge

**Files:**
- Create: `app/business/payment/payment-checkout.server.ts`
- Test: `app/business/payment/payment-checkout.integration.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
const createAsaasCustomer = vi.fn().mockResolvedValue("cus_new")
const findAsaasCustomerByCpf = vi.fn().mockResolvedValue(null)
const createAsaasPayment = vi.fn().mockResolvedValue({
  id: "pay_1",
  status: "PENDING",
  invoiceUrl: "https://sandbox.asaas.com/i/pay_1",
  installmentId: null,
})
const deleteAsaasPayment = vi.fn().mockResolvedValue(true)

vi.mock("./asaas-client.server", () => ({
  createAsaasCustomer: (...a: unknown[]) => createAsaasCustomer(...a),
  findAsaasCustomerByCpf: (...a: unknown[]) => findAsaasCustomerByCpf(...a),
  createAsaasPayment: (...a: unknown[]) => createAsaasPayment(...a),
  deleteAsaasPayment: (...a: unknown[]) => deleteAsaasPayment(...a),
}))

// …fixtures as in Task 2…

describe("pickOption", () => {
  it("creates the customer once and reuses it afterwards", async () => {
    await pickOption({ paymentId: payment.id, profileId, optionId: "pix" })
    expect(createAsaasCustomer).toHaveBeenCalledTimes(1)

    const profile = await kysely
      .selectFrom("profiles")
      .select("asaas_customer_id")
      .where("id", "=", profileId)
      .executeTakeFirstOrThrow()
    expect(profile.asaas_customer_id).toBe("cus_new")

    const second = await openCharge()
    await pickOption({ paymentId: second.id, profileId, optionId: "pix" })
    expect(createAsaasCustomer).toHaveBeenCalledTimes(1)
  })

  it("adopts a customer Asaas already has for that CPF", async () => {
    findAsaasCustomerByCpf.mockResolvedValueOnce("cus_existing")

    await pickOption({ paymentId: payment.id, profileId, optionId: "pix" })

    expect(createAsaasCustomer).not.toHaveBeenCalled()
    const profile = await kysely
      .selectFrom("profiles")
      .select("asaas_customer_id")
      .where("id", "=", profileId)
      .executeTakeFirstOrThrow()
    expect(profile.asaas_customer_id).toBe("cus_existing")
  })

  it("charges the gross of the chosen option and records what came back", async () => {
    const result = await pickOption({ paymentId: payment.id, profileId, optionId: "card_3" })

    expect(createAsaasPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "credit_card",
        installmentCount: 3,
        externalReference: payment.id,
      }),
    )

    const after = await kysely
      .selectFrom("payments")
      .selectAll()
      .where("id", "=", payment.id)
      .executeTakeFirstOrThrow()

    expect(after).toMatchObject({
      status: "awaiting_payment",
      method: "credit_card",
      installment_count: 3,
      asaas_payment_id: "pay_1",
      asaas_invoice_url: "https://sandbox.asaas.com/i/pay_1",
    })
    expect(after.amount).toBeGreaterThan(after.base_amount)
    expect(result.success && result.data.invoiceUrl).toBe(
      "https://sandbox.asaas.com/i/pay_1",
    )
  })

  it("returns the same invoice when the same option is picked twice", async () => {
    await pickOption({ paymentId: payment.id, profileId, optionId: "pix" })
    createAsaasPayment.mockClear()

    const again = await pickOption({ paymentId: payment.id, profileId, optionId: "pix" })

    expect(createAsaasPayment).not.toHaveBeenCalled()
    expect(again.success && again.data.invoiceUrl).toBe("https://sandbox.asaas.com/i/pay_1")
  })

  it("deletes the previous charge when the participant changes their mind", async () => {
    await pickOption({ paymentId: payment.id, profileId, optionId: "pix" })
    await pickOption({ paymentId: payment.id, profileId, optionId: "card_1" })

    expect(deleteAsaasPayment).toHaveBeenCalledWith("pay_1")
  })

  it("deletes the charge it just created when the row is no longer open", async () => {
    await kysely
      .updateTable("payments")
      .set({ status: "cancelled" })
      .where("id", "=", payment.id)
      .execute()

    const result = await pickOption({ paymentId: payment.id, profileId, optionId: "pix" })

    expect(result.success).toBe(false)
    expect(deleteAsaasPayment).toHaveBeenCalledWith("pay_1")
  })

  it("refuses an unknown option", async () => {
    const result = await pickOption({ paymentId: payment.id, profileId, optionId: "card_9" })
    expect(result.success).toBe(false)
    expect(createAsaasPayment).not.toHaveBeenCalled()
  })

  it("refuses someone else's charge", async () => {
    const result = await pickOption({
      paymentId: payment.id,
      profileId: otherProfileId,
      optionId: "pix",
    })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:integration -- app/business/payment/payment-checkout.integration.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

```ts
// app/business/payment/payment-checkout.server.ts
import { applySchema } from "composable-functions"
import { ENV } from "varlock/env"
import { kyselyDb } from "~/kysely-db"
import { paymentsCopy } from "~/copy/payments"
import { appOrigin } from "~/lib/helpers/app-origin"
import { zod } from "~/lib/helpers/zod"
import { logger } from "~/lib/logger/logger.server"
import paths from "~/lib/paths"
import {
  createAsaasCustomer,
  createAsaasPayment,
  deleteAsaasPayment,
  findAsaasCustomerByCpf,
} from "./asaas-client.server"
import { getAsaasFees } from "./asaas-fees.server"
import { buildPaymentOptions, findPaymentOption } from "./pricing"

export const pickOptionSchema = zod.object({
  paymentId: zod.string().uuid(),
  profileId: zod.string().uuid(),
  optionId: zod.string(),
})

/**
 * One Asaas customer per person, reused across events. Asaas does not dedupe,
 * so without this every charge would create another customer for the same CPF.
 */
async function ensureAsaasCustomer(profile: {
  id: string
  asaas_customer_id: string | null
  full_name: string | null
  social_name: string | null
  email: string
  cpf: string | null
  phone: number | null
}): Promise<string> {
  if (profile.asaas_customer_id) return profile.asaas_customer_id

  const existing = await findAsaasCustomerByCpf(profile.cpf ?? "")
  const customerId =
    existing ??
    (await createAsaasCustomer({
      name: profile.full_name || profile.social_name || profile.email,
      cpf: profile.cpf ?? "",
      email: profile.email,
      mobilePhone: profile.phone ? String(profile.phone) : undefined,
      externalReference: profile.id,
    }))

  await kyselyDb
    .updateTable("profiles")
    .set({ asaas_customer_id: customerId })
    .where("id", "=", profile.id)
    .execute()

  return customerId
}

export const pickOption = applySchema(pickOptionSchema)(async (values) => {
  const payment = await kyselyDb
    .selectFrom("payments as p")
    .innerJoin("event_participants as ep", "ep.id", "p.event_participant_id")
    .innerJoin("events as e", "e.id", "ep.event_id")
    .innerJoin("profiles as pr", "pr.id", "ep.profile_id")
    .select([
      "p.id", "p.status", "p.base_amount", "p.due_at", "p.method",
      "p.installment_count", "p.asaas_payment_id", "p.asaas_invoice_url",
      "e.title as event_title",
      "pr.id as profile_id", "pr.asaas_customer_id", "pr.full_name",
      "pr.social_name", "pr.email", "pr.cpf", "pr.phone",
    ])
    .where("p.id", "=", values.paymentId)
    .executeTakeFirst()

  if (!payment || payment.profile_id !== values.profileId) {
    throw new Error(paymentsCopy.page.notYours)
  }

  if (payment.status !== "pending" && payment.status !== "awaiting_payment") {
    throw new Error(paymentsCopy.errors.chargeClosed)
  }

  const options = buildPaymentOptions(payment.base_amount, await getAsaasFees())
  const option = findPaymentOption(options, values.optionId)
  if (!option) {
    throw new Error(paymentsCopy.errors.unknownOption)
  }

  // Same option, charge already created: hand back the invoice rather than
  // opening a second one because somebody double-clicked.
  const sameOption =
    payment.method === option.method &&
    (payment.installment_count ?? null) === (option.installmentCount ?? null)
  if (sameOption && payment.asaas_invoice_url) {
    return { invoiceUrl: payment.asaas_invoice_url }
  }

  const customerId = await ensureAsaasCustomer({
    id: payment.profile_id,
    asaas_customer_id: payment.asaas_customer_id,
    full_name: payment.full_name,
    social_name: payment.social_name,
    email: payment.email,
    cpf: payment.cpf,
    phone: payment.phone,
  })

  const successUrl = ENV.APP_URL
    ? `${appOrigin(null)}${paths.payment.PAYMENT_THANKS(payment.id)}`
    : null

  const charge = await createAsaasPayment({
    customerId,
    method: option.method,
    amount: option.total,
    installmentCount: option.installmentCount,
    dueDate: new Date(payment.due_at),
    description: paymentsCopy.chargeDescription(payment.event_title ?? ""),
    externalReference: payment.id,
    successUrl,
  })

  const updated = await kyselyDb
    .updateTable("payments")
    .set({
      status: "awaiting_payment",
      method: option.method,
      installment_count: option.installmentCount,
      amount: option.total,
      asaas_customer_id: customerId,
      asaas_payment_id: charge.id,
      asaas_installment_id: charge.installmentId,
      asaas_invoice_url: charge.invoiceUrl,
    })
    .where("id", "=", payment.id)
    .where("status", "in", ["pending", "awaiting_payment"])
    .returning("id")
    .executeTakeFirst()

  if (!updated) {
    // The row closed under us — an admin cancelled it, or the cron expired it.
    // The charge we just created is unreachable, so it must not survive.
    try {
      await deleteAsaasPayment(charge.id)
    } catch (error) {
      logger.error("Orphan Asaas charge could not be deleted", {
        paymentId: payment.id,
        asaasPaymentId: charge.id,
        error: error instanceof Error ? error.message : String(error),
      })
    }
    throw new Error(paymentsCopy.errors.chargeClosed)
  }

  // The previous charge, if the participant changed their mind.
  if (payment.asaas_payment_id && payment.asaas_payment_id !== charge.id) {
    try {
      await deleteAsaasPayment(payment.asaas_payment_id)
    } catch (error) {
      logger.error("Replaced Asaas charge could not be deleted", {
        paymentId: payment.id,
        asaasPaymentId: payment.asaas_payment_id,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  if (!charge.invoiceUrl) {
    throw new Error(paymentsCopy.errors.noInvoiceUrl)
  }

  return { invoiceUrl: charge.invoiceUrl }
})
```

Add to `app/copy/payments.ts`:

```ts
  chargeDescription: (eventTitle: string) => `Positiv — ${eventTitle}`,
```

and under `errors`:

```ts
    chargeClosed: "Esta cobrança não está mais aberta.",
    unknownOption: "Escolha uma das formas de pagamento oferecidas.",
    noInvoiceUrl: "O Asaas não devolveu a página de pagamento. Tente de novo.",
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:integration -- app/business/payment/payment-checkout.integration.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/business/payment/payment-checkout.server.ts app/business/payment/payment-checkout.integration.test.ts app/copy/payments.ts
git commit -m "feat(payments): create the Asaas charge when the participant picks an option"
```

---

### Task 4: The page

**Files:**
- Modify: `app/pages/payment/payment-page.tsx`, `app/pages/payment/payment-thanks-page.tsx`
- Create: `app/pages/api/payment/save-cpf.ts`
- Test: `app/pages/payment/payment-page.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
describe("PaymentPage", () => {
  it("lists the options with a price each and defaults to Pix", () => {
    renderPage({ state: "ready", options, chosen: null, /* … */ })

    expect(screen.getByRole("radio", { name: /Pix — R\$ 221,99/ })).toBeChecked()
    expect(
      screen.getByRole("radio", { name: /Cartão 3x de R\$ 78,18/ }),
    ).toBeInTheDocument()
  })

  it("submits the chosen option", async () => {
    renderPage({ state: "ready", options, chosen: null })

    await userEvent.click(screen.getByRole("radio", { name: /Cartão 3x/ }))
    await userEvent.click(screen.getByRole("button", { name: "Pagar" }))

    const [formData] = submit.mock.calls.at(-1) ?? []
    expect(formData.get("optionId")).toBe("card_3")
  })

  it("shows the receipt when it is already paid", () => {
    renderPage({ state: "paid", amount: 22199, paidAt: "2026-08-20T12:00:00Z" })

    expect(screen.getByText("Pagamento confirmado")).toBeInTheDocument()
    expect(screen.getByText(/R\$ 221,99/)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Pagar" })).not.toBeInTheDocument()
  })

  it("explains a closed link without offering to pay", () => {
    renderPage({ state: "closed" })

    expect(screen.getByText("Este link não está mais disponível")).toBeInTheDocument()
    expect(screen.queryByRole("radio")).not.toBeInTheDocument()
  })

  it("asks for the CPF first when the profile has none", () => {
    renderPage({ state: "needs_cpf" })

    expect(screen.getByLabelText("CPF")).toBeInTheDocument()
    expect(screen.queryByRole("radio")).not.toBeInTheDocument()
  })

  it("refuses a CPF whose digits do not check out", async () => {
    renderPage({ state: "needs_cpf" })

    await userEvent.type(screen.getByLabelText("CPF"), "111.111.111-11")
    await userEvent.click(screen.getByRole("button", { name: "Salvar e continuar" }))

    expect(await screen.findByText("Esse CPF não confere. Confira os números.")).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- app/pages/payment`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

`payment-page.tsx`:

```tsx
export async function loader({ params, request }: Route.LoaderArgs) {
  const context = await getUserContext(request, params)
  return loadPaymentPage({
    paymentId: params.paymentId,
    profileId: context.currentProfile.id,
  })
}

export async function action({ params, request }: Route.ActionArgs) {
  const context = await getUserContext(request, params)
  const formData = await request.formData()

  const result = await pickOption({
    paymentId: params.paymentId,
    profileId: context.currentProfile.id,
    optionId: String(formData.get("optionId") ?? ""),
  })

  if (!result.success) {
    return redirectWithError(
      paths.payment.PAYMENT(params.paymentId),
      result.errors[0]?.message ?? paymentsCopy.errors.generic,
    )
  }

  // Asaas hosts the checkout; this leaves the app on purpose.
  throw redirect(result.data.invoiceUrl)
}
```

The component switches on `state` and renders: a `RadioGroup` of options with `paymentsCopy.options.label(option)` (POS-527) and a "Pagar" button; the receipt; the closed message; or the CPF form. The CPF form is a small `useFetcher` posting to `/api/payment/cpf`, which validates with `isValidCpf`, saves to the profile and returns a `CommitResult` — the same shape the form runtime uses.

`payment-thanks-page.tsx` loads the payment, shows `thanksPaidBody` when it is already `paid` and `thanksBody` otherwise, and **never writes anything** — the webhook is the only thing that marks a payment paid.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- app/pages/payment`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/pages/payment app/pages/api/payment app/routes.ts
git commit -m "feat(payments): let the participant choose how to pay"
```

---

### Task 5: The dashboard call to action

**Files:**
- Modify: the dashboard event card (find it with `grep -rn "is_applied" app/components`)
- Modify: `app/pages/dashboard/dashboard-page.tsx` (loader)
- Test: the card's test

- [ ] **Step 1: Write the failing test**

```tsx
  it("offers to pay when there is an open charge", () => {
    render(<EventCard event={{ ...base, active_payment_id: "pay-1", has_paid: false }} />)

    const link = screen.getByRole("link", { name: "Pagar" })
    expect(link).toHaveAttribute("href", "/pagamento/pay-1")
  })

  it("says paid when the ledger says so", () => {
    render(<EventCard event={{ ...base, active_payment_id: null, has_paid: true }} />)

    expect(screen.getByText("Pago")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Pagar" })).not.toBeInTheDocument()
  })

  it("shows neither when nothing has been charged", () => {
    render(<EventCard event={{ ...base, active_payment_id: null, has_paid: false }} />)

    expect(screen.queryByRole("link", { name: "Pagar" })).not.toBeInTheDocument()
    expect(screen.queryByText("Pago")).not.toBeInTheDocument()
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- app/components/organisms/event-card`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

The dashboard loader joins `event_participant_payments` for the current profile's participations and passes `active_payment_id` and `has_paid` into the card. The card renders a `Link` to `paths.payment.PAYMENT(active_payment_id)` labelled `paymentsCopy.page.pay`, or a "Pago" badge, or nothing.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/pages/dashboard app/components/organisms/event-card
git commit -m "feat(payments): show a pay button on the participant's dashboard"
```

---

### Task 6: News item and verification

- [ ] Add a participant-facing news item (`isAdmin: false`) with the `news-dialog` skill: paying online is new and every participant sees it.
- [ ] Run: `pnpm lint`, `pnpm test` — green
- [ ] Manually against the Asaas **sandbox** (`ASAAS_API_URL=https://api-sandbox.asaas.com/v3`): open the link from the email POS-528 sends, pick Pix, land on the Asaas page, confirm the charge in the sandbox dashboard. The payment stays `awaiting_payment` until POS-530 handles the webhook — that is expected here.
- [ ] Run E2E **once, last**: `pnpm test:e2e`

## Definition of done

- PR title: `[POS-529] Let participants choose how to pay`
- `Fixes POS-529`; How to test manually names the sandbox steps
- Delete this plan file before opening the PR
