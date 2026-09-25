// Usage: pnpm asaas:smoke
//
// Checks the pricing engine against the Asaas sandbox: opens a PIX charge and
// a card 3x charge for the same base, confirms them, and compares what Asaas
// kept with what pricing.ts predicted. Run it with the webhook registered
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
} from "../../app/business/payment/asaas-client.server"
import { getAsaasFees } from "../../app/business/payment/asaas-fees.server"
import { buildPaymentOptions, type PaymentOption } from "../../app/business/payment/pricing"
import { calibrate, expectedNet } from "./smoke-calibration"

const BASE = 22000
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
  netValue: zod.number().nullable().optional(),
  invoiceUrl: zod.string().nullable().optional(),
})

const chargeList = zod.object({ data: zod.array(charge) })

const anticipationList = zod.object({
  data: zod.array(zod.object({ fee: zod.number(), status: zod.string() })),
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

async function waitUntilConfirmed(paymentId: string, installmentId: string | null) {
  const deadline = Date.now() + PAYMENT_WAIT_MS
  for (;;) {
    const charges = await chargesOf(paymentId, installmentId)
    if (charges.every((item) => CONFIRMED.includes(item.status))) return charges
    if (Date.now() > deadline) throw new Error(`${paymentId} was not confirmed in time`)
    await sleep(POLL_MS)
  }
}

async function waitForWebhooks(chargeIds: string[]) {
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

// Anticipation is booked apart from the charge. The sandbox may never book
// one, and then there is nothing to measure — which is reported, not passed.
async function anticipationFee(paymentId: string, installmentId: string | null) {
  const query = installmentId ? `installment=${installmentId}` : `payment=${paymentId}`
  const { data } = await asaasRequest("GET", `/anticipations?${query}`, anticipationList)
  const booked = data.filter((item) => !["DENIED", "CANCELLED"].includes(item.status))
  if (booked.length === 0) return null
  return booked.reduce((total, item) => total + reaisToCents(item.fee), 0)
}

async function run(option: PaymentOption, customerId: string, fees: Awaited<ReturnType<typeof getAsaasFees>>) {
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
  const webhooks = await waitForWebhooks(charges.map((item) => item.id))

  const reportedNet = charges.reduce(
    (total, item) => total + reaisToCents(item.netValue ?? 0),
    0,
  )
  const reportedAnticipation = await anticipationFee(created.id, created.installmentId)
  const expected = expectedNet(option, fees)

  return {
    option: option.id,
    value: charges.reduce((total, item) => total + reaisToCents(item.value), 0),
    expectedNet: expected.beforeAnticipation,
    netValue: reportedNet,
    expectedAnticipation: expected.anticipation,
    anticipation: reportedAnticipation,
    webhooks,
    ...calibrate({ expected, reportedNet, reportedAnticipation }),
  }
}

async function main() {
  if (!ENV.ASAAS_API_URL?.includes("sandbox")) {
    throw new Error(`ASAAS_API_URL must point at the sandbox, got ${ENV.ASAAS_API_URL}`)
  }

  const fees = await getAsaasFees()
  const options = buildPaymentOptions(BASE, fees).filter(
    (option) => option.id === "pix" || option.id === "card_3",
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
  for (const option of options) results.push(await run(option, customerId, fees))

  for (const result of results) {
    console.info(
      [
        `\n${result.option}${result.ok ? "" : "  <-- OUTSIDE TOLERANCE"}`,
        `  value                   R$ ${reais(result.value)}`,
        `  expected net            R$ ${reais(result.expectedNet)}`,
        `  netValue                R$ ${reais(result.netValue)}   diff R$ ${reais(result.feeDifference)}`,
        `  expected anticipation   R$ ${reais(result.expectedAnticipation)}`,
        result.anticipation === null
          ? "  anticipation            not measurable in sandbox"
          : `  anticipation            R$ ${reais(result.anticipation)}   diff R$ ${reais(result.anticipationDifference)}`,
        `  webhook                 ${result.webhooks ? "received" : "NOT received"}`,
      ].join("\n"),
    )
  }

  await db.destroy()
  if (results.some((result) => !result.ok || !result.webhooks)) process.exit(1)
}

if (process.argv[1]?.endsWith("smoke.ts")) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
