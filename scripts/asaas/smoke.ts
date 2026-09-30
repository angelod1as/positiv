// Usage: pnpm asaas:smoke
//
// Checks the flat prices against the Asaas sandbox: opens a PIX charge and a
// card 6x charge for the same event price, confirms them, and compares what
// Asaas charged, installment by installment, with what pricing.ts shows the
// participant. Run it with the webhook registered
// against a tunnel to the local production build (docs/payments-runbook.md),
// so it can also say whether each confirmation reached the inbox.
//
// Sandbox only. POST /sandbox/payment/{id}/confirm does not exist in
// production, and the script refuses to run anywhere else.
import { ENV } from "varlock/env"
import { zod } from "../../app/lib/helpers/zod"
import { db } from "../../app/lib/supabase/db.server"
import {
  asaasRequest,
  createAsaasCustomer,
  createAsaasPayment,
  findAsaasCustomerByCpf,
  reaisToCents,
} from "../../app/business/payment/provider/asaas/asaas-client.server"
import {
  buildPaymentOptions,
  type PaymentOption,
  splitInstallments,
} from "../../app/business/payment/pricing"
import { WEBHOOK_NAME } from "./register-webhook"

// Not divisible by 6, so the card plan has a last installment that differs.
const BASE = 25000
// A valid test CPF, the one the E2E fixtures use.
const TEST_CPF = "52998224725"
const CONFIRMED = ["CONFIRMED", "RECEIVED"]
const PAYMENT_WAIT_MS = 15 * 60 * 1000
const WEBHOOK_WAIT_MS = 2 * 60 * 1000
const POLL_MS = 5000

const charge = zod.object({
  id: zod.string(),
  status: zod.string(),
  value: zod.number(),
  installmentNumber: zod.number().nullable().optional(),
  invoiceUrl: zod.string().nullable().optional(),
})

const chargeList = zod.object({ data: zod.array(charge) })

const webhookList = zod.object({
  data: zod.array(zod.object({ name: zod.string(), url: zod.string(), interrupted: zod.boolean().nullable().optional() })),
})

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function reais(cents: number | null) {
  return cents === null ? "—" : (cents / 100).toFixed(2)
}

async function chargesOf(paymentId: string, installmentId: string | null) {
  if (!installmentId) return [await asaasRequest("GET", `/payments/${paymentId}`, charge)]
  const { data } = await asaasRequest(
    "GET",
    `/payments?installment=${installmentId}&limit=100`,
    chargeList,
  )
  return data
}

async function confirm(paymentId: string, invoiceUrl: string | null) {
  try {
    await asaasRequest("POST", `/sandbox/payment/${paymentId}/confirm`, charge, {})
  } catch (error) {
    console.warn(
      `The sandbox would not confirm ${paymentId} through the API (${error instanceof Error ? error.message : error}).`,
    )
    console.warn(
      `Confirm it by hand: pay ${invoiceUrl ?? "the invoice"} with a test card, or use "Confirmar pagamento" in the sandbox dashboard.`,
    )
  }
}

// Without a registered webhook nothing can reach the inbox, and waiting for it
// only looks like a hang.
async function registeredWebhook() {
  const { data } = await asaasRequest("GET", "/webhooks?limit=100", webhookList)
  return data.find((item) => item.name === WEBHOOK_NAME) ?? null
}

async function waitUntilConfirmed(paymentId: string, installmentId: string | null) {
  console.info(`  waiting for Asaas to confirm ${paymentId} (up to ${PAYMENT_WAIT_MS / 60000} min)…`)
  const deadline = Date.now() + PAYMENT_WAIT_MS
  for (;;) {
    const charges = await chargesOf(paymentId, installmentId)
    if (charges.every((item) => CONFIRMED.includes(item.status))) return charges
    if (Date.now() > deadline) throw new Error(`${paymentId} was not confirmed in time`)
    await sleep(POLL_MS)
  }
}

async function waitForWebhooks(chargeIds: string[]) {
  console.info(`  waiting for the webhook to reach payment_webhook_events (up to ${WEBHOOK_WAIT_MS / 60000} min)…`)
  const deadline = Date.now() + WEBHOOK_WAIT_MS
  for (;;) {
    const rows = await db
      .selectFrom("payment_webhook_events")
      .select("asaas_payment_id")
      .where("asaas_payment_id", "in", chargeIds)
      .where("event_type", "in", ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"])
      .execute()
    const arrived = new Set(rows.map((row) => row.asaas_payment_id))
    if (chargeIds.every((id) => arrived.has(id))) return true
    if (Date.now() > deadline) return false
    await sleep(POLL_MS)
  }
}

async function run(option: PaymentOption, customerId: string, checkWebhooks: boolean) {
  const created = await createAsaasPayment({
    customerId,
    method: option.method,
    amount: option.total,
    installmentCount: option.installmentCount,
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    description: `Positiv — smoke ${option.id}`,
    externalReference: `smoke-${option.id}-${Date.now()}`,
    successUrl: null,
  })
  console.info(`${option.id}: created ${created.id} for R$ ${reais(option.total)}`)

  await confirm(created.id, created.invoiceUrl)
  const charges = await waitUntilConfirmed(created.id, created.installmentId)
  const webhooks = checkWebhooks ? await waitForWebhooks(charges.map((item) => item.id)) : null

  const charged = [...charges]
    .sort((a, b) => (a.installmentNumber ?? 0) - (b.installmentNumber ?? 0))
    .map((item) => reaisToCents(item.value))
  const expected = splitInstallments(option.total, option.installmentCount ?? 1)

  return {
    option: option.id,
    expected,
    charged,
    webhooks,
    ok: expected.join() === charged.join(),
  }
}

async function main() {
  if (!ENV.ASAAS_API_URL?.includes("sandbox")) {
    throw new Error(`ASAAS_API_URL must point at the sandbox, got ${ENV.ASAAS_API_URL}`)
  }

  const options = buildPaymentOptions(BASE, { cardEnabled: true }).filter(
    (option) => option.id === "pix" || option.id === "card_6",
  )

  const customerId =
    (await findAsaasCustomerByCpf(TEST_CPF)) ??
    (await createAsaasCustomer({
      name: "Positiv Smoke Test",
      cpf: TEST_CPF,
      email: "smoke-test@example.com",
      externalReference: "smoke-test",
    }))

  const results = []
  const webhook = await registeredWebhook()
  if (webhook) {
    console.info(`Webhook "${webhook.name}" → ${webhook.url}${webhook.interrupted ? " (INTERRUPTED — see the runbook)" : ""}`)
  } else {
    console.warn(
      `No "${WEBHOOK_NAME}" webhook is registered on this account, so the inbox check is skipped. See docs/payments-runbook.md §9 to test delivery too.`,
    )
  }

  for (const option of options) results.push(await run(option, customerId, webhook !== null))

  for (const result of results) {
    console.info(
      [
        `\n${result.option}${result.ok ? "" : "  <-- DIFFERS FROM THE PAGE"}`,
        `  expected                ${result.expected.map(reais).join(" + ")}`,
        `  charged                 ${result.charged.map(reais).join(" + ")}`,
        `  webhook                 ${result.webhooks === null ? "not checked" : result.webhooks ? "received" : "NOT received"}`,
      ].join("\n"),
    )
  }

  await db.destroy()
  if (results.some((result) => !result.ok || result.webhooks === false)) process.exit(1)
}

if (process.argv[1]?.endsWith("smoke.ts")) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
