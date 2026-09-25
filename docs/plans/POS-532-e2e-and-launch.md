# POS-532 — E2E with a mock Asaas, sandbox calibration, runbook — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The whole Asaas payment journey is covered by an automated test that never touches Asaas, the PIX and card fees are checked against real sandbox charges, and there is a runbook for when the webhook queue breaks. `PAYMENTS_ENABLED` stays **off** in production.

**Out of scope:** the production cutover, the anticipation calibration, the news item and the flag going on are POS-560. Switching online payments off at any moment from the admin — and its E2E — is POS-565, which builds on the mock this PR adds.

**Architecture:** A small HTTP server, started by the E2E global setup next to the production build, answers the Asaas endpoints and records what it was asked. `ASAAS_API_URL` points at it. The global setup and the Playwright workers are separate processes, so specs read and reset the mock over HTTP (`/__mock/calls`, `/__mock/reset`), never through module state. Separately, a script exercises the real sandbox through a tunnel to compare what Asaas keeps with what the pricing engine predicted.

**Spec:** `docs/plans/payments-v3-design.md` §9, §10 PR 13, §12.

**Read first:** `e2e/README.md` and the E2E section of `CLAUDE.md`. E2E runs once, at the end, behind the database lock.

## What the Asaas docs say (checked 2026-09-25)

- There is no official Asaas mock; the sandbox cannot serve CI (a tunnel per run, and a `SEQUENTIALLY` queue that one failed delivery stalls).
- `POST /v3/sandbox/payment/{id}/confirm` is documented for any billing type, but an FAQ says confirmation happens in the sandbox UI, and a changelog says the "Confirmar pagamento" / "Receber cobrança" buttons now work for cards. The smoke script tries the API and falls back to printing the charge link.
- Anticipation is its own object — `GET /v3/anticipations?payment=|installment=` returns `value`, `fee`, `netValue` — not part of the charge's `netValue`, and the anticipation simulation is unavailable in the sandbox. The sandbox calibrates PIX and card fees only; the anticipation term waits for POS-560's real charge.
- A `CONFIRMED` or `REFUNDED` charge cannot be deleted, only a pending or overdue one. The mock refuses the same way.
- A tunnel must point at the production build (`pnpm build`, then `PORT=5173 HOST=127.0.0.1 pnpm start`), not `pnpm dev`: dev binds `[::1]` only and Vite rejects the tunnel's host.

---

### Task 1: The mock Asaas server

**Files:** create `e2e/mocks/asaas-mock-server.ts`, test `e2e/mocks/asaas-mock-server.test.ts` (Vitest already includes `e2e/**/*.test.ts`).

- [ ] Red: drive the mock over HTTP — refuses a request without `access_token`; `POST /customers` requires `name` + `cpfCnpj` and answers the Asaas error envelope; `GET /customers?cpfCnpj=` finds or misses; `POST /payments` with `value` (one charge) or `installmentCount` + `totalValue` (a plan: one charge per installment sharing an `installment` id), `invoiceUrl` on the mock itself; unknown customer → 400; `DELETE /payments/{id}` works on pending, refuses a confirmed one and a second delete; `POST /payments/{id}/refund`; `GET /payments?installment=`; `GET /myAccount/fees/` returns the sandbox snapshot from POS-519; `POST /sandbox/payment/{id}/confirm`; `/__mock/calls` lists every call; `/__mock/reset` empties the state.
- [ ] Green: a single `node:http` server with in-memory state. Exports `startAsaasMockServer(port)`, `stopAsaasMockServer()`, and the E2E constants (`E2E_ASAAS_API_KEY`, `E2E_ASAAS_WEBHOOK_TOKEN`).
- [ ] Commit `test(e2e): add a mock Asaas the suite can assert against`

### Task 2: Serve the build against the mock

**Files:** modify `e2e/serve-production.ts`, `e2e/global-setup.ts`, `e2e/global-teardown.ts`, `e2e/utils/run-context.ts`; tests beside them.

- [ ] Red: the server under test gets `PAYMENTS_ENABLED=true`, `ASAAS_API_URL=<mock>/v3`, the E2E key and webhook token, and empty anticipation overrides — whatever the developer's `.env` holds.
- [ ] Green: the mock port is derived in `run-context` the way the server port is; global setup starts the mock before the app, teardown stops it.
- [ ] Commit `test(e2e): serve the build against the mock Asaas`

### Task 3: Payment helpers and page object

**Files:** create `e2e/utils/payment-helpers.ts`, `e2e/pages/PaymentPage.ts`.

- [ ] `getPaymentsForParticipant`, `postWebhook` (the E2E token, a unique `evt_` id — `payment_webhook_events` is not cleaned and dedupes on it), `getMockCalls`, `resetMock`. Unit-test the pure parts.
- [ ] `PaymentPage` extends `BasePage`: `navigate`, `fillCpf`, `chooseOption`, `pay`, `expectPaid`, `expectClosed`.
- [ ] Commit `test(e2e): add payment helpers and the payment page object`

### Task 4: The journey spec

**Files:** create `e2e/tests/authenticated/admin-asaas-payment.spec.ts` (admin project; the participant half runs in a second browser context signed in as the participant).

- [ ] Offer: "Enviar cobrança" → "Seu pagamento da …" in Mailpit, link extracted.
- [ ] Pay: participant opens the link, passes the CPF gate if shown, picks "Cartão 3x", "Pagar" → mock recorded `CREDIT_CARD`, `installmentCount: 3`, `externalReference` = the row; row `awaiting_payment`.
- [ ] Confirm: POST `PAYMENT_CONFIRMED` → grid "Pago", "Pagamento confirmado - …" email, link shows the receipt; the same event again changes nothing and sends no second email.
- [ ] Refund: "Reembolsar" → "Solicitar reembolso" → one mock refund per charge in the plan, shares summing to `asaas_net`; POST `PAYMENT_PARTIALLY_REFUNDED` → status and "Reembolso - …" email.
- [ ] The manual path is already covered by `admin-manage-payment.spec.ts`; the off switch by POS-565.
- [ ] Commit `test(e2e): cover the Asaas payment journey`

### Task 5: Sandbox smoke script

**Files:** create `scripts/asaas/smoke.ts` and its test; `package.json` gets `"asaas:smoke": "varlock run -- tsx scripts/asaas/smoke.ts"`.

- [ ] Red/green on the pure comparison: given the fees, base and what Asaas reports, the expected gross, the net difference and the verdict (tolerance R$ 0,50).
- [ ] The script: read the real fees; create a customer; a PIX charge at `grossForPix(22000)` and a card 3x at `grossForCard(22000, 3)`; confirm through the sandbox endpoint, else print the link for a manual confirm; wait for each webhook in `payment_webhook_events`; read `/anticipations`; print `value`, `netValue`, anticipation `fee` (or "not measurable in sandbox"), difference; exit non-zero past tolerance.
- [ ] Commit `feat(scripts): add the Asaas sandbox smoke script`
- [ ] Angelo runs it on the sandbox; the table goes in the PR body. A systematic gap on the fees → separate commit to `pricing.ts` and its table, recomputed by hand.

### Task 6: The runbook

**Files:** create `docs/payments-runbook.md`, link from `docs/README.md`.

- [ ] Environment; registering the webhook; un-interrupting the queue (`PUT /v3/webhooks/{id} {"interrupted": false}`); reading the inbox; the payment email outbox and the given-up rows (`given_up_at IS NOT NULL AND sent_at IS NULL`); a charge stuck in `awaiting_payment`; refund windows (PIX 90 d, card 365 d); turning payments off; trying the whole flow by hand in dev against the sandbox.
- [ ] Commit `docs(payments): add the runbook`

### Task 7: Verification

- [ ] `pnpm lint`, `pnpm test`
- [ ] E2E once, last, after checking the lock: `pnpm test:e2e`
- [ ] Delete this plan file before the PR

## Definition of done

- PR title `[POS-532] Cover the Asaas payment journey end to end and calibrate on the sandbox`, `Fixes POS-532`, the calibration table under Testing.
- Flag still off in production.
