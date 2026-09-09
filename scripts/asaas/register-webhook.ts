// Usage: pnpm asaas:register-webhook https://www.positivparty.com
//
// Points the Asaas account behind ASAAS_API_KEY at this environment's webhook
// endpoint. Run once per environment; running it again updates the same
// webhook rather than adding a second one, because Asaas would then deliver
// every event twice.
import { ENV } from "varlock/env"
import { asaasRequest } from "../../app/business/payment/asaas-client.server"
import { zod } from "../../app/lib/helpers/zod"

export const WEBHOOK_NAME = "Positiv"

// Every event the webhook handler acts on, from the payments design §5.3.
// PAYMENT_CREATED is included so a charge that never reaches the participant
// still leaves a trace. The refund-denied, chargeback and risk events carry no
// transition and exist to raise an alert: a denied refund means a participant
// was told their money is coming back and it is not.
export const WEBHOOK_EVENTS = [
  "PAYMENT_CREATED",
  "PAYMENT_CONFIRMED",
  "PAYMENT_RECEIVED",
  "PAYMENT_OVERDUE",
  "PAYMENT_DELETED",
  "PAYMENT_RESTORED",
  "PAYMENT_UPDATED",
  "PAYMENT_REFUND_IN_PROGRESS",
  "PAYMENT_REFUNDED",
  "PAYMENT_PARTIALLY_REFUNDED",
  "PAYMENT_REFUND_DENIED",
  "PAYMENT_CHARGEBACK_REQUESTED",
  "PAYMENT_CHARGEBACK_DISPUTE",
  "PAYMENT_AWAITING_CHARGEBACK_REVERSAL",
  "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED",
  "PAYMENT_REPROVED_BY_RISK_ANALYSIS",
] as const

const MINIMUM_TOKEN_LENGTH = 32

const webhook = zod.object({
  id: zod.string(),
  name: zod.string(),
  url: zod.string(),
})

const webhookList = zod.object({
  data: zod.array(webhook),
  hasMore: zod.boolean().nullable().optional(),
})

// Asaas paginates its list endpoints. Reading only the first page would miss
// an existing webhook on an account that has accumulated a few, and the script
// would then create a second one — which is the "every event delivered twice"
// failure the lookup exists to prevent.
const PAGE_SIZE = 100

async function findWebhookByName(name: string) {
  let offset = 0

  for (;;) {
    const page = await asaasRequest(
      "GET",
      `/webhooks?limit=${PAGE_SIZE}&offset=${offset}`,
      webhookList,
    )

    const found = page.data.find((item) => item.name === name)
    if (found) return found
    // An empty page ends the walk whatever hasMore claims, so a server that
    // always says there is more cannot spin this forever.
    if (!page.hasMore || page.data.length === 0) return null

    offset += page.data.length
  }
}

export async function registerAsaasWebhook(
  origin: string,
): Promise<{ created: boolean; id: string }> {
  if (!origin) throw new Error("usage: register-webhook <https://origin>")

  const token = ENV.ASAAS_WEBHOOK_TOKEN
  if (!token || token.length < MINIMUM_TOKEN_LENGTH) {
    throw new Error(
      `ASAAS_WEBHOOK_TOKEN must be set and at least ${MINIMUM_TOKEN_LENGTH} characters long`,
    )
  }

  const body = {
    name: WEBHOOK_NAME,
    url: `${origin.replace(/\/+$/, "")}/api/asaas/webhook`,
    email: "contato@positivparty.com",
    enabled: true,
    interrupted: false,
    apiVersion: 3,
    authToken: token,
    // Asaas delivers one event at a time and pauses the queue after 15
    // failures, which is what keeps a bad deploy from losing a payment.
    sendType: "SEQUENTIALLY",
    events: WEBHOOK_EVENTS,
  }

  const existing = await findWebhookByName(WEBHOOK_NAME)

  const saved = existing
    ? await asaasRequest("PUT", `/webhooks/${existing.id}`, webhook, body)
    : await asaasRequest("POST", "/webhooks", webhook, body)

  return { created: !existing, id: saved.id }
}

async function main() {
  const { created, id } = await registerAsaasWebhook(process.argv[2] ?? "")
  console.info(`${created ? "Created" : "Updated"} the Asaas webhook ${id}`)
}

if (process.argv[1]?.endsWith("register-webhook.ts")) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
