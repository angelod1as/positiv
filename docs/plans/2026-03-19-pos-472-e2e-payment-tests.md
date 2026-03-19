# POS-472: E2E Tests for Payment System Flows

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add E2E tests covering the full payment system — admin management, webhook simulation, payment page, email verification via Mailhog, and a local Asaas mock server (zero external dependencies).

**Architecture:** A local HTTP server mimics the Asaas API (`e2e/mocks/asaas-mock-server.ts`) — starts in global-setup, stops in global-teardown. `ASAAS_API_URL` points to `localhost:9999`. Tests use Playwright against the production build with Mailhog for email and direct webhook POSTs for payment confirmation. Payment requests seeded/verified via Supabase admin client.

**Tech Stack:** Playwright, Mailhog, Node HTTP server (Asaas mock), Supabase admin client

---

## Task 1: Add refund email to manual refund flow (TDD)

**Files:**
- Modify: `app/business/payment/payment-request.server.ts`
- Modify: `app/business/payment/payment-request.server.test.ts`

Currently `markManualPaymentRefunded` only updates the DB. It should also send the refund notification email (same as automatic refund does via `processRefund`).

**Step 1: Write the failing test**

In `payment-request.server.test.ts`, add to the existing test or create a new describe block:

```typescript
describe("markManualPaymentRefunded", () => {
  it("sends refund notification email after marking as refunded", async () => {
    // Mock the DB to return a refunded result
    // Then verify sendPaymentRefundEmail was called
  })
})
```

The function needs to look up participant info (profile email, event name) and call `sendPaymentRefundEmail`. Follow the same pattern as `processRefund` in `trigger-payment-request.server.ts`.

**Step 2: Implement — add email sending to `markManualPaymentRefunded`**

After the successful DB update, look up participant info and send the refund email (best-effort, wrapped in try-catch):

```typescript
export async function markManualPaymentRefunded(eventParticipantId: string) {
  // ... existing DB update ...

  // Send refund notification (best-effort)
  try {
    const participantInfo = await kyselyDb
      .selectFrom("event_participants")
      .innerJoin("profiles", "profiles.id", "event_participants.profile_id")
      .innerJoin("events", "events.id", "event_participants.event_id")
      .select(["profiles.email", "profiles.full_name", "events.title"])
      .where("event_participants.id", "=", eventParticipantId)
      .executeTakeFirst()

    if (participantInfo?.email) {
      await sendPaymentRefundEmail({
        participantEmail: participantInfo.email,
        participantName: participantInfo.full_name ?? "Participante",
        eventName: participantInfo.title ?? "Evento Positiv",
        refundAmount: Number(result.amount),
      })
    }
  } catch (emailError) {
    logger.error("Failed to send manual refund notification email (non-fatal)", {
      eventParticipantId,
      error: emailError instanceof Error ? emailError.message : String(emailError),
    })
  }

  return result
}
```

**Step 3: Run tests**

```bash
pnpm test:unit -- app/business/payment/payment-request.server.test.ts
```

**Step 4: Commit**

```bash
git commit -m "feat(payment): send refund notification email on manual refund"
```

---

## Task 2: Create Asaas mock server

**Files:**
- Create: `e2e/mocks/asaas-mock-server.ts`

A lightweight Node HTTP server that mimics the Asaas API. Tracks all calls for test assertions.

```typescript
import { createServer, type IncomingMessage, type ServerResponse, type Server } from "node:http"

interface AsaasCall {
  method: string
  path: string
  body: Record<string, unknown>
  timestamp: number
}

let calls: AsaasCall[] = []
let server: Server | null = null

function handleRequest(req: IncomingMessage, res: ServerResponse) {
  let body = ""
  req.on("data", (chunk: string) => (body += chunk))
  req.on("end", () => {
    const parsed = body ? JSON.parse(body) : {}
    calls.push({
      method: req.method!,
      path: req.url!,
      body: parsed,
      timestamp: Date.now(),
    })

    res.setHeader("Content-Type", "application/json")
    const url = req.url!

    // POST /api/v3/customers
    if (req.method === "POST" && url === "/api/v3/customers") {
      res.end(JSON.stringify({ id: `cus_mock_${Date.now()}` }))
      return
    }

    // POST /api/v3/payments
    if (req.method === "POST" && url === "/api/v3/payments") {
      res.end(JSON.stringify({
        id: `pay_mock_${Date.now()}`,
        invoiceUrl: "http://localhost:5173/",
      }))
      return
    }

    // POST /api/v3/payments/:id/refund
    if (req.method === "POST" && url.match(/^\/api\/v3\/payments\/[^/]+\/refund$/)) {
      const id = url.split("/")[4]
      res.end(JSON.stringify({ id, status: "REFUNDED" }))
      return
    }

    // DELETE /api/v3/payments/:id
    if (req.method === "DELETE" && url.match(/^\/api\/v3\/payments\/[^/]+$/)) {
      const id = url.split("/")[4]
      res.end(JSON.stringify({ deleted: true, id }))
      return
    }

    // GET /api/v3/... (for any future needs)
    res.statusCode = 404
    res.end(JSON.stringify({ error: "Unknown endpoint" }))
  })
}

export function startAsaasMockServer(port = 9999): Promise<void> {
  return new Promise((resolve) => {
    server = createServer(handleRequest)
    server.listen(port, () => {
      console.info(`✅ Asaas mock server running on port ${port}`)
      resolve()
    })
  })
}

export function stopAsaasMockServer(): Promise<void> {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        console.info("✅ Asaas mock server stopped")
        resolve()
      })
    } else {
      resolve()
    }
  })
}

export function getAsaasCalls(): AsaasCall[] {
  return [...calls]
}

export function clearAsaasCalls(): void {
  calls = []
}

export function getAsaasCallsByMethod(method: string): AsaasCall[] {
  return calls.filter((c) => c.method === method)
}

export function getAsaasCallsByPath(pathPattern: RegExp): AsaasCall[] {
  return calls.filter((c) => pathPattern.test(c.path))
}
```

**Commit:**

```bash
git commit -m "test(e2e): add Asaas mock server for E2E tests"
```

---

## Task 3: Integrate mock server into E2E lifecycle

**Files:**
- Modify: `e2e/global-setup.ts` — start mock server
- Modify: `e2e/global-teardown.ts` — stop mock server
- Modify: `.env` — set `PAYMENT_SYSTEM_ONLINE=true` and `ASAAS_API_URL=http://localhost:9999`

In `global-setup.ts`, after starting the production server, start the Asaas mock:

```typescript
import { startAsaasMockServer } from "./mocks/asaas-mock-server"
// ... in setup:
await startAsaasMockServer(9999)
```

In `global-teardown.ts`, before stopping the production server:

```typescript
import { stopAsaasMockServer } from "./mocks/asaas-mock-server"
// ... in teardown:
await stopAsaasMockServer()
```

In `.env`, add/update:

```
PAYMENT_SYSTEM_ONLINE=true
ASAAS_API_URL=http://localhost:9999
ASAAS_API_KEY=mock-api-key
```

`ASAAS_WEBHOOK_TOKEN` should be unset (or empty) so webhook tests can POST without a token.

**Commit:**

```bash
git commit -m "test(e2e): integrate Asaas mock server into E2E lifecycle"
```

---

## Task 4: Payment test utilities

**Files:**
- Create: `e2e/utils/payment-helpers.ts`

Helpers for seeding payment requests, querying them, posting webhooks, and creating test events. See the full code in the previous plan version — same content, no changes needed.

Key functions:
- `getPaymentRequestByEventParticipantId(epId)` — query latest payment request
- `getEventParticipantId(profileId, eventId)` — look up EP id
- `seedPaymentRequest({...})` — insert payment request directly
- `updatePaymentRequest(id, fields)` — update fields
- `deletePaymentRequestsByParticipant(epId)` — cleanup
- `postWebhook({ event, payment })` — POST to `/api/asaas-webhook`
- `createTestEvent({ title, ticketPrice })` — create event with `[E2E-TEST]` prefix
- `cleanupTestPaymentEvent(eventId)` — delete event + participants + payment requests

**Commit:**

```bash
git commit -m "test(e2e): add payment test utilities"
```

---

## Task 5: Admin payment management E2E tests

**Files:**
- Create: `e2e/tests/authenticated/admin-payment-management.spec.ts`

### Tests:

1. **Admin triggers automatic payment** — change status to `sent_payment_data` → verify payment request created → verify payment link email in Mailhog
2. **Admin triggers manual payment** — set mode to Manual, change status → verify payment request created as manual → verify NO email
3. **Admin cancels pending payment** — seed pending request → click "Cancelar pagamento" → confirm → verify status = cancelled
4. **Admin marks manual as paid** — seed manual pending → click "Marcar como pago" → confirm → verify status = paid
5. **Admin refunds (manual)** — seed manual paid → click "Marcar como reembolsado" → confirm → verify status = refunded + refund email in Mailhog
6. **Admin resends payment link** — existing automatic request → click "Reenviar link" → verify new email in Mailhog
7. **Webhook PAYMENT_CONFIRMED** — seed awaiting_payment with fake asaas_id → POST webhook → verify paid in DB + UI
8. **Webhook PAYMENT_OVERDUE** — seed awaiting_payment → POST webhook → verify expired in DB + UI

**Commit:**

```bash
git commit -m "test(e2e): add admin payment management E2E tests"
```

---

## Task 6: Participant payment page E2E tests + page object

**Files:**
- Create: `e2e/pages/PaymentPage.ts`
- Create: `e2e/tests/authenticated/user-payment-page.spec.ts`

### PaymentPage page object:
- `navigate(eventParticipantId)` — go to `/pagamento/:id`
- `expectReadyState(eventName)` — heading "Pagamento", event name visible, "Pagar" button visible
- `expectAlreadyPaidState()` — heading "Pagamento já realizado"
- `expectExpiredState()` — heading "Link expirado"
- `getPaymentOptions()` — open dropdown, get option texts

### Tests:

9. **Auth guard — non-owner redirected** — logged-in user1 tries to access another user's payment page → redirected with "Você não tem permissão" toast
10. **Payment page shows options** — create event_participant for user1, seed payment request → navigate → verify PIX + CC options with correct prices

**Commit:**

```bash
git commit -m "test(e2e): add participant payment page E2E tests"
```

---

## Task 7: Run full E2E suite and fix issues

Run all E2E tests to verify nothing is broken:

```bash
pnpm test:e2e
```

Fix timing issues, selector mismatches, cleanup order problems. Then:

```bash
git commit -m "test(e2e): fix E2E test issues"
```

---

## Commit Plan

1. `feat(payment): send refund notification email on manual refund`
2. `test(e2e): add Asaas mock server for E2E tests`
3. `test(e2e): integrate Asaas mock server into E2E lifecycle`
4. `test(e2e): add payment test utilities`
5. `test(e2e): add admin payment management E2E tests`
6. `test(e2e): add participant payment page E2E tests`
7. `test(e2e): fix E2E test issues` (if needed)
