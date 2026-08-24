# POS-532 — E2E with a mock Asaas, sandbox calibration, runbook, flag on — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The whole payment journey is covered by an automated test that never touches Asaas, the pricing formula is checked against a real sandbox charge, there is a runbook for when the webhook queue breaks, and the flag goes on in production.

**Architecture:** A small HTTP server started alongside the production build under `E2E_MODE` answers the Asaas endpoints and records what it was asked, so a spec can assert on the request the app made, not only on what the screen shows. `ASAAS_API_URL` points at it. Separately, a script exercises the real sandbox through a tunnel once, to confirm that what Asaas keeps matches what the pricing engine predicted.

**Tech Stack:** Playwright, Node `http`, Mailpit, `cloudflared`, tsx.

**Spec:** `docs/plans/payments-v3-design.md` §9, §10 PR 13, §12 (risks).

**Branch:** `pos-532-e2e-and-launch` from `main`, worktree `wt/pos-532-e2e-and-launch`.

**Depends on:** POS-531 for the code, POS-519 for the production account.

**Read first:** `e2e/README.md` and the E2E section of `CLAUDE.md`. E2E runs against `pnpm build`, one at a time, behind the database lock, and takes ~8 minutes. Run it **once, at the end** — never as a mid-task check.

---

### Task 1: The mock Asaas server

**Files:**
- Create: `e2e/mocks/asaas-mock-server.ts`
- Modify: `e2e/serve-production.ts`
- Modify: `.env.schema` comment only (document the E2E value)
- Test: `e2e/mocks/asaas-mock-server.test.ts` (a unit test — it runs under `vitest`, which already includes `e2e/**/*.test.ts`)

- [ ] **Step 1: Write the failing test**

```ts
// e2e/mocks/asaas-mock-server.ts is a plain HTTP server; this test drives it
// over the wire, the same way the app under test will.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import {
  getAsaasCalls,
  getAsaasPayment,
  resetAsaasState,
  startAsaasMockServer,
  stopAsaasMockServer,
} from "./asaas-mock-server"

let baseUrl: string

beforeAll(async () => {
  baseUrl = await startAsaasMockServer(0)
})

afterAll(async () => {
  await stopAsaasMockServer()
})

beforeEach(() => {
  resetAsaasState()
})

function call(path: string, init: RequestInit = {}) {
  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { access_token: "test-key", "Content-Type": "application/json", ...init.headers },
  })
}

describe("asaas mock server", () => {
  it("refuses a request without the api key", async () => {
    const response = await fetch(`${baseUrl}/customers`, { method: "POST", body: "{}" })
    expect(response.status).toBe(401)
  })

  it("creates a customer and requires name and cpfCnpj", async () => {
    const bad = await call("/customers", { method: "POST", body: JSON.stringify({ name: "A" }) })
    expect(bad.status).toBe(400)
    expect((await bad.json()).errors[0].code).toBe("invalid_cpfCnpj")

    const good = await call("/customers", {
      method: "POST",
      body: JSON.stringify({ name: "Ana", cpfCnpj: "52998224725" }),
    })
    expect(good.status).toBe(200)
    expect((await good.json()).id).toMatch(/^cus_/)
  })

  it("finds a customer by cpf", async () => {
    await call("/customers", {
      method: "POST",
      body: JSON.stringify({ name: "Ana", cpfCnpj: "52998224725" }),
    })

    const found = await call("/customers?cpfCnpj=52998224725&limit=1")
    expect((await found.json()).data).toHaveLength(1)

    const missing = await call("/customers?cpfCnpj=11144477735&limit=1")
    expect((await missing.json()).data).toHaveLength(0)
  })

  it("creates a payment and gives back an invoice url", async () => {
    const customer = await (
      await call("/customers", {
        method: "POST",
        body: JSON.stringify({ name: "Ana", cpfCnpj: "52998224725" }),
      })
    ).json()

    const response = await call("/payments", {
      method: "POST",
      body: JSON.stringify({
        customer: customer.id,
        billingType: "PIX",
        value: 221.99,
        dueDate: "2026-09-01",
        externalReference: "payment-uuid",
      }),
    })

    const payment = await response.json()
    expect(payment.id).toMatch(/^pay_/)
    expect(payment.invoiceUrl).toContain(payment.id)
    expect(payment.status).toBe("PENDING")
    expect(getAsaasPayment(payment.id)?.externalReference).toBe("payment-uuid")
  })

  it("rejects a payment for a customer it does not know", async () => {
    const response = await call("/payments", {
      method: "POST",
      body: JSON.stringify({ customer: "cus_nope", billingType: "PIX", value: 10, dueDate: "2026-09-01" }),
    })
    expect(response.status).toBe(400)
  })

  it("returns an installment id for a plan", async () => {
    const customer = await (
      await call("/customers", {
        method: "POST",
        body: JSON.stringify({ name: "Ana", cpfCnpj: "52998224725" }),
      })
    ).json()

    const payment = await (
      await call("/payments", {
        method: "POST",
        body: JSON.stringify({
          customer: customer.id,
          billingType: "CREDIT_CARD",
          installmentCount: 3,
          totalValue: 234.54,
          dueDate: "2026-09-01",
        }),
      })
    ).json()

    expect(payment.installment).toMatch(/^inst_/)
  })

  it("deletes and refunds, and refuses to do either twice", async () => {
    const customer = await (
      await call("/customers", {
        method: "POST",
        body: JSON.stringify({ name: "Ana", cpfCnpj: "52998224725" }),
      })
    ).json()
    const payment = await (
      await call("/payments", {
        method: "POST",
        body: JSON.stringify({ customer: customer.id, billingType: "PIX", value: 10, dueDate: "2026-09-01" }),
      })
    ).json()

    expect((await call(`/payments/${payment.id}`, { method: "DELETE" })).status).toBe(200)
    expect((await call(`/payments/${payment.id}`, { method: "DELETE" })).status).toBe(400)
  })

  it("reports the account fees", async () => {
    const fees = await (await call("/myAccount/fees/")).json()
    expect(fees.payment.pix.fixedFeeValue).toBe(1.99)
    expect(fees.payment.creditCard.oneInstallmentPercentage).toBe(2.99)
  })

  it("records every call so a spec can assert on it", async () => {
    await call("/customers", {
      method: "POST",
      body: JSON.stringify({ name: "Ana", cpfCnpj: "52998224725" }),
    })

    const calls = getAsaasCalls("/customers")
    expect(calls).toHaveLength(1)
    expect(calls[0].body).toMatchObject({ notificationDisabled: undefined })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- e2e/mocks/asaas-mock-server.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

A single `node:http` server with an in-memory store: `customers`, `payments`, and a `calls` array of `{ method, path, body }`. It validates what the real API validates — the `access_token` header, `name` + `cpfCnpj` on a customer, a known customer and a positive value on a payment — and answers with the Asaas error envelope on failure. Exports `startAsaasMockServer(port)` returning the base URL, `stopAsaasMockServer()`, `resetAsaasState()`, `getAsaasPayment(id)`, `getAsaasCustomers()`, `getAsaasCalls(path?)`, and `confirmAsaasPayment(id)` for the specs to flip a charge to `RECEIVED`.

In `e2e/serve-production.ts`, start it before the app and hand the app its URL:

```ts
  const asaasUrl = await startAsaasMockServer(0)
  serverProcess = spawn("pnpm", ["react-router-serve", serverPath], {
    // …
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: "production",
      PAYMENTS_ENABLED: "true",
      ASAAS_API_URL: asaasUrl,
      ASAAS_API_KEY: "e2e-key",
      ASAAS_WEBHOOK_TOKEN: "e2e-webhook-token-that-is-long-enough-00",
    },
  })
```

and stop it in `stopProductionServer`. The variables are set here rather than in `.env` so a developer's real sandbox credentials are never what the suite runs against.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- e2e/mocks/asaas-mock-server.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add e2e/mocks e2e/serve-production.ts
git commit -m "test(e2e): add a mock Asaas the suite can assert against"
```

---

### Task 2: Payment helpers for the specs

**Files:**
- Create: `e2e/utils/payment-helpers.ts`
- Create: `e2e/pages/PaymentPage.ts`

- [ ] **Step 1: Write the helpers**

`payment-helpers.ts` needs, using the Supabase admin client already used by `db-cleanup.ts`:

- `getPaymentForParticipant(eventParticipantId)` — newest row
- `getEventParticipantId(profileId, eventId)`
- `seedPayment({ eventParticipantId, ... })` for states the UI cannot reach quickly
- `postWebhook(event)` — POSTs to `${baseUrl}/api/asaas/webhook` with the `asaas-access-token` header matching what `serve-production.ts` sets
- `deletePaymentsForParticipants(ids)` — called before participant cleanup, because of `ON DELETE RESTRICT`

`PaymentPage.ts` extends `BasePage`: `navigate(paymentId)`, `chooseOption(id)`, `pay()`, `expectPaid()`, `expectClosed()`, `fillCpf(value)`.

Wire the payment cleanup into `e2e/utils/db-cleanup.ts` if POS-521 has not already.

- [ ] **Step 2: Type-check**

Run: `pnpm lint`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add e2e/utils/payment-helpers.ts e2e/pages/PaymentPage.ts e2e/utils/db-cleanup.ts
git commit -m "test(e2e): add payment helpers and the payment page object"
```

---

### Task 3: The journey specs

**Files:**
- Create: `e2e/tests/authenticated/user-payment.spec.ts`
- Create: `e2e/tests/authenticated/admin-payment.spec.ts`

The project globs are strict: an authenticated spec must be named `user-*.spec.ts` or `admin-*.spec.ts` under `e2e/tests/authenticated/`.

- [ ] **Step 1: Write the user journey**

```ts
test("a participant pays a charge from start to finish", async ({ page }) => {
  // Admin has already sent the payment data (seeded), so this spec is the
  // participant's half of the journey.
  const payment = await seedPayment({ eventParticipantId, baseAmount: 22000 })

  const paymentPage = new PaymentPage(page)
  await paymentPage.navigate(payment.id)

  // Every option is priced above the ticket, because the fees are passed on.
  await expect(page.getByRole("radio", { name: /^Pix — R\$/ })).toBeVisible()
  await expect(page.getByRole("radio", { name: /Cartão 3x de R\$/ })).toBeVisible()

  await paymentPage.chooseOption("card_3")
  await paymentPage.pay()

  // The app hands off to Asaas; the mock's invoice url is where it lands.
  await expect(page).toHaveURL(/\/i\/pay_/)

  // The mock recorded exactly what the app asked for.
  const [charge] = getAsaasCalls("/payments")
  expect(charge.body.billingType).toBe("CREDIT_CARD")
  expect(charge.body.installmentCount).toBe(3)
  expect(charge.body.externalReference).toBe(payment.id)

  const afterChoice = await getPaymentForParticipant(eventParticipantId)
  expect(afterChoice.status).toBe("awaiting_payment")
  expect(afterChoice.amount).toBeGreaterThan(22000)

  // Asaas confirms.
  const response = await postWebhook({
    id: `evt_${Date.now()}`,
    event: "PAYMENT_CONFIRMED",
    payment: {
      id: charge.response.id,
      value: afterChoice.amount / 100,
      netValue: 220,
    },
  })
  expect(response.status).toBe(200)

  const afterWebhook = await getPaymentForParticipant(eventParticipantId)
  expect(afterWebhook.status).toBe("paid")
  expect(afterWebhook.asaas_net).toBe(22000)

  // And the participant is told.
  await verifyEmailContent(
    await waitForEmail({ to: participantEmail, subject: "Pagamento confirmado" }),
    { bodyContains: ["R$", "Cartão"] },
  )

  // Reopening the link now shows a receipt, not a form.
  await paymentPage.navigate(payment.id)
  await paymentPage.expectPaid()
})

test("the same webhook delivered twice changes nothing the second time", async () => { /* … */ })

test("a closed charge cannot be paid", async ({ page }) => { /* seed an expired one, expectClosed */ })

test("a participant cannot open someone else's charge", async ({ page }) => { /* … */ })
```

- [ ] **Step 2: Write the admin journey**

```ts
test("an admin sends the payment data, resends it and refunds", async ({ page }) => {
  // 1. Change the status → a charge is opened and the email goes out.
  await participantPage.setApplicationStatus("Dados de pagto enviados")
  const email = await waitForEmail({ to: participantEmail, subject: "Link de pagamento" })
  expect(extractEmailBody(email)).toContain("/pagamento/")

  const first = await getPaymentForParticipant(eventParticipantId)
  expect(first.status).toBe("pending")

  // 2. Resend with a different amount → the first is cancelled, a second opens.
  await participantPage.openPaymentModal()
  await participantPage.resendWithAmount("150")
  const second = await getPaymentForParticipant(eventParticipantId)
  expect(second.id).not.toBe(first.id)
  expect(second.base_amount).toBe(15000)

  // 3. Record a manual payment instead, then refund half of it.
  await participantPage.cancelCharge()
  await participantPage.registerManualPayment({ amount: "150", method: "Pix" })
  await participantPage.markRefunded({ amount: "50" })

  const totals = await getParticipantTotals(eventParticipantId)
  expect(totals.paid_gross).toBe(15000)
  expect(totals.net).toBe(10000)
})

test("nothing is charged when the flag is off", async () => { /* … */ })

test("the grid shows the payment status without letting anyone edit it", async ({ page }) => { /* … */ })
```

- [ ] **Step 3: Run E2E — once**

Check the lock first:

```bash
cat "$(git rev-parse --git-common-dir)/db-lock/owner" 2>/dev/null
```

No output means it is free. Then:

Run: `pnpm test:e2e`
Expected: every project green.

- [ ] **Step 4: Commit**

```bash
git add e2e/tests
git commit -m "test(e2e): cover the payment journey end to end"
```

---

### Task 4: Sandbox calibration

**Files:**
- Create: `scripts/asaas/smoke.ts`
- Modify: `package.json`

This is what turns the pricing formula from a guess into a measurement. §12 of the spec calls the anticipation term an approximation until this runs.

- [ ] **Step 1: Write the script**

`pnpm asaas:smoke` against the sandbox:

1. Create a customer with a valid test CPF.
2. Create a PIX charge for `grossForPix(22000, fees)` and a card 3x charge for `grossForCard(22000, 3, fees)`.
3. Confirm both with `POST /v3/sandbox/payment/{id}/confirm`.
4. Fetch each payment and print a table: `value`, `netValue`, the `base` the pricing engine started from, and `netValue*100 − base`.
5. Exit non-zero when any difference exceeds 50 cents.

The last column is the answer: zero or a few cents means the formula is right; a systematic gap means the anticipation term is applied differently and `ASAAS_ANTICIPATION_MONTHLY_RATE` (or the formula) needs adjusting. Record the numbers in the PR body.

```json
"asaas:smoke": "varlock run -- tsx scripts/asaas/smoke.ts"
```

- [ ] **Step 2: Run it against the sandbox**

```bash
# Terminal 1 — a public URL for the webhook
cloudflared tunnel --url http://localhost:5173

# Terminal 2 — point Asaas at it, once
pnpm asaas:register-webhook https://<the-tunnel>.trycloudflare.com

# Terminal 3
pnpm dev
pnpm asaas:smoke
```

Expected: both charges confirm, the differences are within a few cents, and the webhook deliveries arrive (visible in `payment_webhook_events`).

- [ ] **Step 3: Adjust the pricing if the numbers disagree**

If the gap is systematic, change the anticipation term in `app/business/payment/pricing.ts` and update the expected values in `pricing.test.ts` to match the new formula — recomputing them by hand, not by copying what the code prints.

- [ ] **Step 4: Commit**

```bash
git add scripts/asaas/smoke.ts package.json app/business/payment/pricing.ts app/business/payment/pricing.test.ts
git commit -m "test(payments): calibrate the pricing formula against the Asaas sandbox"
```

---

### Task 5: The runbook

**Files:**
- Create: `docs/payments-runbook.md`
- Modify: `docs/README.md` (link it)

- [ ] **Step 1: Write it**

Sections, each with the exact command:

1. **Environment** — the five variables, where each lives, which differ between sandbox and production.
2. **Registering the webhook** — `pnpm asaas:register-webhook <origin>`, and what the events list must contain.
3. **The webhook queue stopped** — Asaas interrupts after 15 consecutive failures and emails the address on the webhook. Fix the cause first, then `PUT /v3/webhooks/{id} { "interrupted": false }`. Events are kept 14 days; older ones are gone.
4. **Reading the inbox** —
   ```sql
   SELECT event_type, asaas_payment_id, received_at, error
     FROM payment_webhook_events
    WHERE processed_at IS NULL OR error IS NOT NULL
    ORDER BY received_at DESC LIMIT 50;
   ```
5. **A payment is stuck in `awaiting_payment`** — check the inbox, check the Asaas dashboard, and if the money really arrived, replay the event from the Asaas dashboard rather than editing the row.
6. **Refund windows** — PIX 90 days and the fee comes back; card 365 days, partial refunds keep the fee; boleto is not offered.
7. **Turning payments off** — set `PAYMENTS_ENABLED=false` and redeploy. Open charges stay open on Asaas; the payment page and the webhook answer 404. Cancel the charges in the Asaas dashboard if the pause is long.
8. **What to check after a deploy** — `SELECT count(*) FROM payments WHERE status = 'awaiting_payment' AND due_at < now()` should be small; a growing number means the webhook is not arriving.

- [ ] **Step 2: Commit**

```bash
git add docs/payments-runbook.md docs/README.md
git commit -m "docs(payments): add the runbook"
```

---

### Task 6: News item and launch

- [ ] **Step 1: News item**

Participant-facing (`isAdmin: false`), via the `news-dialog` skill:

```ts
export default {
  title: "💳 Dá para pagar pelo site",
  content:
    "Quando a organização liberar seu pagamento, o link chega por email e o botão aparece no seu painel. Você escolhe entre Pix e cartão em até 6x, paga na página do Asaas e recebe a confirmação por email.",
  isAdmin: false,
  createdAt: new Date("<YYYY-MM-DD>T12:00:00"),
} satisfies NewsItemContent
```

- [ ] **Step 2: Production checklist**

Before flipping the flag, confirm every item of POS-519 is done, then:

- [ ] `ASAAS_API_URL=https://api.asaas.com/v3` and the **production** key are set in Coolify
- [ ] `ASAAS_WEBHOOK_TOKEN` is set and is at least 32 characters
- [ ] `pnpm asaas:register-webhook https://www.positivparty.com` has run against production
- [ ] `positivparty.com` is in the account's commercial data, or `callback.successUrl` will be refused
- [ ] One real charge of R$ 1,00 to a personal card or PIX key, confirmed and then refunded, before anyone else is invited to pay
- [ ] `PAYMENTS_ENABLED=true` and redeploy
- [ ] Watch `payment_webhook_events` for the first hour

- [ ] **Step 3: Commit**

```bash
git add app/components/organisms/news-dialog/items
git commit -m "docs(news): announce paying online"
```

---

### Task 7: Full verification

- [ ] Run: `pnpm lint` — clean
- [ ] Run: `pnpm test` — unit and integration green
- [ ] Run: `pnpm build` — succeeds
- [ ] Run E2E **once, last**, after checking the lock: `pnpm test:e2e`
- [ ] The sandbox smoke numbers from Task 4 are in the PR body

## Definition of done

- PR title: `[POS-532] Cover the payment journey end to end and turn payments on`
- `Fixes POS-532`; the calibration table under Testing; the production checklist under How to test manually
- Delete this plan file before opening the PR
- After the deploy: flip `PAYMENTS_ENABLED` to `true`, and only then tell the community
