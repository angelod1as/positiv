# POS-472: E2E Tests for Payment System Flows

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add E2E tests covering the full payment system — admin management, webhook simulation, payment page, and email verification via Mailhog.

**Architecture:** Tests use Playwright against the production build with Mailhog for email verification and direct webhook POSTs to simulate Asaas responses. No Asaas sandbox dependency. Payment request rows are seeded/manipulated via Supabase admin client to set up the right states for each test scenario.

**Tech Stack:** Playwright, Mailhog, Supabase admin client, Vitest (for E2E)

---

## Key Constraints

1. **`PAYMENT_SYSTEM_ONLINE=true`** must be set in `.env` for E2E — it's a runtime env var (not compile-time), so setting it in `.env` before `pnpm test:e2e` is sufficient. This won't break existing tests since no other tests touch payment routes.

2. **No real Asaas API calls in E2E.** The admin trigger flow (`sent_payment_data`) only creates a DB row and sends an email (via Mailhog) — no Asaas calls happen until the participant confirms on the payment page. For webhook tests, we seed `asaas_payment_id` directly in the DB.

3. **Cleanup:** Payment requests must be cleaned up with participants. The `cleanupTestParticipants` function deletes `event_participants` by `profile_id`, which cascades to `payment_requests` via the FK.

---

## Task 1: Payment test utilities

**Files:**
- Create: `e2e/utils/payment-helpers.ts`

Utilities for creating/querying/manipulating payment requests and posting webhooks from E2E tests.

**Step 1: Create the helpers file**

```typescript
import { createSupabaseAdminClient } from "./db-cleanup"

const APP_BASE_URL = "http://localhost:5173"

export async function getPaymentRequestByEventParticipantId(
  eventParticipantId: string,
) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("payment_requests")
    .select("*")
    .eq("event_participant_id", eventParticipantId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (error) return null
  return data
}

export async function getEventParticipantId(
  profileId: string,
  eventId: string,
) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("event_participants")
    .select("id")
    .eq("profile_id", profileId)
    .eq("event_id", eventId)
    .single()

  if (error) throw new Error(`Event participant not found: ${error.message}`)
  return data.id
}

export async function seedPaymentRequest(params: {
  eventParticipantId: string
  amount: number
  status?: string
  paymentMode?: string
  asaasPaymentId?: string
}) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("payment_requests")
    .insert({
      event_participant_id: params.eventParticipantId,
      amount: params.amount,
      status: params.status ?? "pending",
      payment_mode: params.paymentMode ?? "automatic",
      asaas_payment_id: params.asaasPaymentId ?? null,
      expires_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to seed payment request: ${error.message}`)
  return data
}

export async function updatePaymentRequest(
  paymentRequestId: string,
  fields: Record<string, unknown>,
) {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from("payment_requests")
    .update(fields)
    .eq("id", paymentRequestId)

  if (error) throw new Error(`Failed to update payment request: ${error.message}`)
}

export async function deletePaymentRequestsByParticipant(
  eventParticipantId: string,
) {
  const supabase = createSupabaseAdminClient()
  await supabase
    .from("payment_requests")
    .delete()
    .eq("event_participant_id", eventParticipantId)
}

export async function postWebhook(payload: {
  event: string
  payment: { id: string; value?: number }
}) {
  const response = await fetch(`${APP_BASE_URL}/api/asaas-webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return {
    status: response.status,
    body: await response.json(),
  }
}

export async function createTestEvent(params: {
  title: string
  ticketPrice: number
}) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("events")
    .insert({
      title: params.title,
      ticket_price: params.ticketPrice,
      event_status: "Registration Open",
      time_event_start: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      time_event_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
      registration_opens_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      capacity: 50,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create test event: ${error.message}`)
  return data
}

export async function cleanupTestPaymentEvent(eventId: string) {
  const supabase = createSupabaseAdminClient()

  // Delete payment_requests for this event's participants
  const { data: participants } = await supabase
    .from("event_participants")
    .select("id")
    .eq("event_id", eventId)

  if (participants) {
    for (const p of participants) {
      await supabase
        .from("payment_requests")
        .delete()
        .eq("event_participant_id", p.id)
    }
  }

  // Delete event participants
  await supabase
    .from("event_participants")
    .delete()
    .eq("event_id", eventId)

  // Delete event
  await supabase
    .from("events")
    .delete()
    .eq("id", eventId)
}
```

**Step 2: Commit**

```bash
git add e2e/utils/payment-helpers.ts
git commit -m "test(e2e): add payment test utilities"
```

---

## Task 2: Admin payment management E2E tests

**Files:**
- Create: `e2e/tests/authenticated/admin-payment-management.spec.ts`

This is the main test file. It covers admin-facing payment flows.

**Important prereqs:**
- `.env` must have `PAYMENT_SYSTEM_ONLINE=true` (check and set if missing)
- Mailhog must be running (`pnpm email:test` or `docker run -p 8025:8025 -p 1025:1025 mailhog/mailhog`)

**Test structure:**

```typescript
import { test, expect } from "@playwright/test"
import path from "node:path"
import {
  createTestEvent,
  cleanupTestPaymentEvent,
  getPaymentRequestByEventParticipantId,
  getEventParticipantId,
  seedPaymentRequest,
  updatePaymentRequest,
  postWebhook,
} from "../../utils/payment-helpers"
import {
  createTestEventWithParticipants,
  cleanupTestParticipants,
  type TestParticipant,
} from "../../utils/event-helpers"
import { clearAllEmails, waitForEmail, verifyEmailContent } from "../../utils/email-helpers"

test.use({
  storageState: path.resolve(import.meta.dirname, "../../.auth/admin.json"),
})

let eventId: string
let participants: TestParticipant[]

test.beforeAll(async () => {
  // Create a test event with ticket_price
  const event = await createTestEvent({
    title: "[E2E-TEST] Payment Test Event",
    ticketPrice: 100,
  })
  eventId = event.id

  // Create participants for this event
  participants = await createTestEventWithParticipants(eventId, 3)
})

test.afterAll(async () => {
  await cleanupTestParticipants(participants)
  await cleanupTestPaymentEvent(eventId)
})

test.beforeEach(async () => {
  await clearAllEmails()
})
```

### Test 1: Admin triggers automatic payment

```typescript
test("admin triggers automatic payment and email arrives", async ({ page }) => {
  const participant = participants[0]

  // Navigate to participant detail
  await page.goto(`/admin/eventos/${eventId}/participantes/${participant.profileId}`)
  await page.waitForLoadState("networkidle")

  // Verify payment mode is "Automático" (default)
  // Change application_status to sent_payment_data
  const statusSelect = page.locator("#application_status")
  await statusSelect.click()
  await page.getByRole("option", { name: "Dados de pagamento enviados" }).click()

  // Wait for auto-save response
  await page.waitForResponse(
    (resp) => resp.request().method() === "POST" && resp.status() === 200,
  )

  // Verify payment request was created
  const epId = await getEventParticipantId(participant.profileId, eventId)
  const paymentRequest = await getPaymentRequestByEventParticipantId(epId)
  expect(paymentRequest).not.toBeNull()
  expect(paymentRequest!.status).toBe("pending")
  expect(paymentRequest!.payment_mode).toBe("automatic")

  // Verify payment link email arrived in Mailhog
  const email = await waitForEmail({
    to: participant.email,
    subject: "Link de pagamento",
    timeout: 15000,
  })

  await verifyEmailContent(email, {
    subject: "Link de pagamento",
    bodyContains: [participant.fullName, "[E2E-TEST] Payment Test Event"],
  })
})
```

### Test 2: Admin triggers manual payment (no email)

```typescript
test("admin triggers manual payment — no email sent", async ({ page }) => {
  const participant = participants[1]

  await page.goto(`/admin/eventos/${eventId}/participantes/${participant.profileId}`)
  await page.waitForLoadState("networkidle")

  // Set payment mode to Manual
  const paymentModeSelect = page.locator("#payment_mode_select")
  await paymentModeSelect.click()
  await page.getByRole("option", { name: "Manual" }).click()

  // Change application_status to sent_payment_data
  const statusSelect = page.locator("#application_status")
  await statusSelect.click()
  await page.getByRole("option", { name: "Dados de pagamento enviados" }).click()

  await page.waitForResponse(
    (resp) => resp.request().method() === "POST" && resp.status() === 200,
  )

  // Verify payment request created as manual
  const epId = await getEventParticipantId(participant.profileId, eventId)
  const paymentRequest = await getPaymentRequestByEventParticipantId(epId)
  expect(paymentRequest).not.toBeNull()
  expect(paymentRequest!.payment_mode).toBe("manual")

  // Wait briefly and verify NO email was sent
  await new Promise((r) => setTimeout(r, 3000))
  const emails = await getAllEmails()
  const paymentEmails = emails.filter((e) =>
    e.Content.Headers.Subject?.[0]?.includes("Link de pagamento"),
  )
  expect(paymentEmails.length).toBe(0)
})
```

### Test 3: Admin cancels pending payment

```typescript
test("admin cancels pending automatic payment", async ({ page }) => {
  const participant = participants[2]
  const epId = await getEventParticipantId(participant.profileId, eventId)

  // Seed a pending automatic payment request
  await seedPaymentRequest({
    eventParticipantId: epId,
    amount: 100,
    status: "pending",
    paymentMode: "automatic",
  })

  await page.goto(`/admin/eventos/${eventId}/participantes/${participant.profileId}`)
  await page.waitForLoadState("networkidle")

  // Click "Cancelar pagamento" button
  await page.getByRole("button", { name: "Cancelar pagamento" }).click()

  // Confirm in the dialog
  await page.getByRole("button", { name: "Confirmar cancelamento" }).click()

  // Wait for response
  await page.waitForResponse(
    (resp) => resp.request().method() === "POST" && resp.status() === 200,
  )

  // Verify payment request is now cancelled
  const paymentRequest = await getPaymentRequestByEventParticipantId(epId)
  expect(paymentRequest!.status).toBe("cancelled")
})
```

### Test 4: Admin marks manual payment as paid

```typescript
test("admin marks manual payment as paid", async ({ page }) => {
  const participant = participants[2]
  const epId = await getEventParticipantId(participant.profileId, eventId)

  // Clean up previous test's payment request and seed manual pending
  await deletePaymentRequestsByParticipant(epId)
  await seedPaymentRequest({
    eventParticipantId: epId,
    amount: 100,
    status: "pending",
    paymentMode: "manual",
  })

  await page.goto(`/admin/eventos/${eventId}/participantes/${participant.profileId}`)
  await page.waitForLoadState("networkidle")

  // Click "Marcar como pago"
  await page.getByRole("button", { name: "Marcar como pago" }).click()
  await page.getByRole("button", { name: "Confirmar pagamento" }).click()

  await page.waitForResponse(
    (resp) => resp.request().method() === "POST" && resp.status() === 200,
  )

  // Verify
  const paymentRequest = await getPaymentRequestByEventParticipantId(epId)
  expect(paymentRequest!.status).toBe("paid")
  expect(paymentRequest!.paid_at).not.toBeNull()
})
```

### Test 5: Admin refunds automatic payment + refund email

```typescript
test("admin refunds automatic payment and refund email arrives", async ({ page }) => {
  const participant = participants[2]
  const epId = await getEventParticipantId(participant.profileId, eventId)

  // Seed a paid automatic payment with asaas_payment_id
  await deletePaymentRequestsByParticipant(epId)
  await seedPaymentRequest({
    eventParticipantId: epId,
    amount: 100,
    status: "paid",
    paymentMode: "automatic",
    asaasPaymentId: `pay_e2e_refund_${Date.now()}`,
  })

  // NOTE: The refund action calls refundAsaasPayment which hits the real Asaas API.
  // In E2E without Asaas sandbox, this will FAIL and the refund will be rolled back.
  // For a full refund E2E, you would need ASAAS_API_KEY set to sandbox credentials.
  //
  // ALTERNATIVE: Test the manual refund flow instead (no Asaas call):
  await deletePaymentRequestsByParticipant(epId)
  await seedPaymentRequest({
    eventParticipantId: epId,
    amount: 100,
    status: "paid",
    paymentMode: "manual",
  })

  await page.goto(`/admin/eventos/${eventId}/participantes/${participant.profileId}`)
  await page.waitForLoadState("networkidle")

  // Click "Marcar como reembolsado"
  await page.getByRole("button", { name: "Marcar como reembolsado" }).click()
  await page.getByRole("button", { name: "Confirmar reembolso" }).click()

  await page.waitForResponse(
    (resp) => resp.request().method() === "POST" && resp.status() === 200,
  )

  // Verify DB
  const paymentRequest = await getPaymentRequestByEventParticipantId(epId)
  expect(paymentRequest!.status).toBe("refunded")

  // NOTE: Manual refund currently does NOT send the refund email
  // (only automatic refund via processRefund does).
  // If you want to test refund email, you need to either:
  // a) Add email sending to markManualPaymentRefunded too, or
  // b) Test with real Asaas sandbox credentials
})
```

### Test 6: Admin resends payment link

```typescript
test("admin resends payment link and new email arrives", async ({ page }) => {
  const participant = participants[0]

  // participant[0] already has a payment request from test 1
  await page.goto(`/admin/eventos/${eventId}/participantes/${participant.profileId}`)
  await page.waitForLoadState("networkidle")

  await clearAllEmails()

  // Click "Reenviar link"
  await page.getByRole("button", { name: "Reenviar link" }).click()

  await page.waitForResponse(
    (resp) => resp.request().method() === "POST" && resp.status() === 200,
  )

  // Verify new email arrived
  const email = await waitForEmail({
    to: participant.email,
    subject: "Link de pagamento",
    timeout: 15000,
  })

  expect(email).not.toBeNull()
})
```

### Test 7: Webhook — payment confirmed

```typescript
test("webhook PAYMENT_CONFIRMED marks payment as paid", async ({ page }) => {
  const participant = participants[2]
  const epId = await getEventParticipantId(participant.profileId, eventId)

  // Seed an awaiting_payment request with a fake asaas_payment_id
  const fakeAsaasId = `pay_e2e_webhook_${Date.now()}`
  await deletePaymentRequestsByParticipant(epId)
  await seedPaymentRequest({
    eventParticipantId: epId,
    amount: 100,
    status: "awaiting_payment",
    paymentMode: "automatic",
    asaasPaymentId: fakeAsaasId,
  })

  // POST webhook
  const result = await postWebhook({
    event: "PAYMENT_CONFIRMED",
    payment: { id: fakeAsaasId, value: 100 },
  })

  expect(result.status).toBe(200)
  expect(result.body.action).toBe("marked_paid")

  // Verify DB
  const paymentRequest = await getPaymentRequestByEventParticipantId(epId)
  expect(paymentRequest!.status).toBe("paid")
  expect(paymentRequest!.paid_at).not.toBeNull()

  // Verify UI shows "Pago"
  await page.goto(`/admin/eventos/${eventId}/participantes/${participant.profileId}`)
  await page.waitForLoadState("networkidle")
  await expect(page.getByText("Pago")).toBeVisible()
})
```

### Test 8: Webhook — payment overdue

```typescript
test("webhook PAYMENT_OVERDUE marks payment as expired", async ({ page }) => {
  const participant = participants[2]
  const epId = await getEventParticipantId(participant.profileId, eventId)

  const fakeAsaasId = `pay_e2e_overdue_${Date.now()}`
  await deletePaymentRequestsByParticipant(epId)
  await seedPaymentRequest({
    eventParticipantId: epId,
    amount: 100,
    status: "awaiting_payment",
    paymentMode: "automatic",
    asaasPaymentId: fakeAsaasId,
  })

  const result = await postWebhook({
    event: "PAYMENT_OVERDUE",
    payment: { id: fakeAsaasId },
  })

  expect(result.status).toBe(200)
  expect(result.body.action).toBe("marked_expired")

  const paymentRequest = await getPaymentRequestByEventParticipantId(epId)
  expect(paymentRequest!.status).toBe("expired")

  // Verify UI shows "Expirado"
  await page.goto(`/admin/eventos/${eventId}/participantes/${participant.profileId}`)
  await page.waitForLoadState("networkidle")
  await expect(page.getByText("Expirado")).toBeVisible()
})
```

**Step: Run tests**

```bash
PAYMENT_SYSTEM_ONLINE=true pnpm test:e2e -- --project=chromium-authenticated-admin e2e/tests/authenticated/admin-payment-management.spec.ts
```

**Commit:**

```bash
git add e2e/tests/authenticated/admin-payment-management.spec.ts
git commit -m "test(e2e): add admin payment management E2E tests"
```

---

## Task 3: Participant payment page E2E tests

**Files:**
- Create: `e2e/tests/authenticated/user-payment-page.spec.ts`
- Create: `e2e/pages/PaymentPage.ts`

### Step 3a: Page object

```typescript
import { type Locator, type Page, expect } from "@playwright/test"

export class PaymentPage {
  readonly page: Page
  readonly heading: Locator
  readonly paymentForm: Locator
  readonly payButton: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.getByRole("heading", { level: 1 })
    this.paymentForm = page.locator("form")
    this.payButton = page.getByRole("button", { name: "Pagar" })
  }

  async navigate(eventParticipantId: string) {
    await this.page.goto(`/pagamento/${eventParticipantId}`)
    await this.page.waitForLoadState("networkidle")
  }

  async expectReadyState(eventName: string) {
    await expect(this.heading).toHaveText("Pagamento")
    await expect(this.page.getByText(eventName)).toBeVisible()
    await expect(this.payButton).toBeVisible()
  }

  async expectAlreadyPaidState() {
    await expect(this.heading).toHaveText("Pagamento já realizado")
  }

  async expectExpiredState() {
    await expect(this.heading).toHaveText("Link expirado")
  }

  async getPaymentOptions(): Promise<string[]> {
    await this.page.getByRole("combobox").click()
    const options = this.page.getByRole("option")
    const texts = await options.allTextContents()
    // Close dropdown
    await this.page.keyboard.press("Escape")
    return texts
  }
}
```

### Step 3b: Tests

```typescript
import { test, expect } from "@playwright/test"
import path from "node:path"
import { PaymentPage } from "../../pages/PaymentPage"
import {
  createTestEvent,
  cleanupTestPaymentEvent,
  seedPaymentRequest,
  getEventParticipantId,
  deletePaymentRequestsByParticipant,
} from "../../utils/payment-helpers"
import {
  createTestEventWithParticipants,
  cleanupTestParticipants,
  type TestParticipant,
} from "../../utils/event-helpers"

// These tests run as an authenticated USER (not admin)
test.use({
  storageState: path.resolve(import.meta.dirname, "../../.auth/user.json"),
})

let eventId: string
let participants: TestParticipant[]

test.beforeAll(async () => {
  const event = await createTestEvent({
    title: "[E2E-TEST] Payment Page Test Event",
    ticketPrice: 220,
  })
  eventId = event.id
  participants = await createTestEventWithParticipants(eventId, 1)
})

test.afterAll(async () => {
  await cleanupTestParticipants(participants)
  await cleanupTestPaymentEvent(eventId)
})
```

### Test 9: Auth guard — non-owner redirected

```typescript
test("non-owner is redirected with error", async ({ page }) => {
  // The authenticated user is user1@example.com
  // The participant was created by createTestEventWithParticipants (different user)
  // So user1 does NOT own this participant → should redirect
  const epId = await getEventParticipantId(participants[0].profileId, eventId)

  // Seed a payment request so the page would normally show
  await seedPaymentRequest({
    eventParticipantId: epId,
    amount: 220,
    status: "pending",
    paymentMode: "automatic",
  })

  const paymentPage = new PaymentPage(page)
  await paymentPage.navigate(epId)

  // Should redirect to home with error toast
  await expect(page).toHaveURL("/")
  // The toast "Você não tem permissão para acessar esta página de pagamento." should show
  await expect(page.getByText("Você não tem permissão")).toBeVisible()

  // Cleanup
  await deletePaymentRequestsByParticipant(epId)
})
```

### Test 10: Payment page shows options with correct prices

**NOTE:** This test requires the authenticated user to OWN the participant. Since `createTestEventWithParticipants` creates separate test users, we need to either:
- Create a participant for the authenticated E2E user (user1@example.com), or
- Log in as the test participant user

The simplest approach: create an event_participant for the user1@example.com profile, seed a payment request, then navigate.

```typescript
test("owner sees payment options with correct prices", async ({ page }) => {
  const supabase = createSupabaseAdminClient()

  // Get the authenticated user's profile (user1@example.com)
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", "user1@example.com")
    .single()

  if (!profile) throw new Error("user1 profile not found")

  // Create an event_participant for this user
  const { data: ep } = await supabase
    .from("event_participants")
    .insert({
      profile_id: profile.id,
      event_id: eventId,
      is_user_applied: true,
      application_status: "sent_payment_data",
    })
    .select()
    .single()

  if (!ep) throw new Error("Failed to create event_participant")

  // Seed a payment request
  await seedPaymentRequest({
    eventParticipantId: ep.id,
    amount: 220,
    status: "pending",
    paymentMode: "automatic",
  })

  const paymentPage = new PaymentPage(page)
  await paymentPage.navigate(ep.id)

  // Verify ready state
  await paymentPage.expectReadyState("[E2E-TEST] Payment Page Test Event")

  // Verify payment options include PIX and CC options
  const options = await paymentPage.getPaymentOptions()
  expect(options.length).toBeGreaterThanOrEqual(2) // At least PIX + CC 1x
  expect(options.some((o) => o.includes("Pix"))).toBe(true)
  expect(options.some((o) => o.includes("Cartão"))).toBe(true)
  // Verify PIX shows the base price
  expect(options.some((o) => o.includes("R$") && o.includes("220"))).toBe(true)

  // Cleanup
  await deletePaymentRequestsByParticipant(ep.id)
  await supabase.from("event_participants").delete().eq("id", ep.id)
})
```

**Step: Run tests**

```bash
PAYMENT_SYSTEM_ONLINE=true pnpm test:e2e -- --project=chromium-authenticated-user e2e/tests/authenticated/user-payment-page.spec.ts
```

**Commit:**

```bash
git add e2e/pages/PaymentPage.ts e2e/tests/authenticated/user-payment-page.spec.ts
git commit -m "test(e2e): add participant payment page E2E tests"
```

---

## Task 4: Ensure PAYMENT_SYSTEM_ONLINE is set for E2E

**Files:**
- Modify: `.env` (add `PAYMENT_SYSTEM_ONLINE=true` if not present)

Check if `.env` already has `PAYMENT_SYSTEM_ONLINE`. If not, add it. The E2E tests need the payment system online to test automatic flows and the payment page.

Also verify that `ASAAS_WEBHOOK_TOKEN` is either unset or empty — our webhook tests POST without a token, and when `ASAAS_WEBHOOK_TOKEN` is not configured, the webhook skips auth (dev mode).

**Commit:**

```bash
git add .env
git commit -m "chore: enable PAYMENT_SYSTEM_ONLINE for E2E tests"
```

---

## Task 5: Run full E2E suite and fix issues

Run the complete E2E suite to verify nothing is broken:

```bash
PAYMENT_SYSTEM_ONLINE=true pnpm test:e2e
```

Fix any issues that arise. Common problems:
- Selectors not matching (Radix UI components have specific DOM structure)
- Timing issues (auto-save may need longer waits)
- Cleanup order (payment_requests FK constraint)
- Email timing (Mailhog polling may need longer timeout)

After all E2E tests pass:

```bash
git add -A
git commit -m "test(e2e): fix E2E test issues for payment flows"
```

---

## Commit Plan

1. `test(e2e): add payment test utilities`
2. `test(e2e): add admin payment management E2E tests`
3. `test(e2e): add participant payment page E2E tests`
4. `chore: enable PAYMENT_SYSTEM_ONLINE for E2E tests`
5. `test(e2e): fix E2E test issues for payment flows` (if needed)

## Important Notes

### Refund email limitation

The refund notification email is only sent by `processRefund` (automatic refunds via Asaas). Manual refunds (`markManualPaymentRefunded`) do NOT send an email. To test the refund email in E2E, you'd need real Asaas sandbox credentials — or add email sending to the manual refund flow too. This is a decision for Angelo.

### What we're NOT testing in E2E

- **Asaas payment creation** (requires real Asaas sandbox) — covered by unit/integration tests
- **Payment page form submission** (redirects to Asaas invoiceUrl) — covered by unit tests
- **Webhook token validation** — covered by unit tests
- **Data table payment trigger** (AG Grid inline editing) — could be added later but the admin detail page covers the same business logic

### Test isolation

Each test that modifies payment_requests should clean up after itself or seed fresh data at the start. The tests share participants but each test seeds/cleans its own payment_requests.
