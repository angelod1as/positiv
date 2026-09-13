import { redirectWithError } from "remix-toast"
import { ENV } from "varlock/env"
import { getAsaasFees } from "~/business/payment/asaas-fees.server"
import { isValidCpf } from "~/business/payment/cpf"
import {
  buildPaymentOptions,
  type PaymentOption,
} from "~/business/payment/pricing"
import { paymentsCopy } from "~/copy/payments"
import { kyselyDb } from "~/kysely-db"
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

const OPEN_STATUSES = ["pending", "awaiting_payment"]
const SETTLED_STATUSES = ["paid", "partially_refunded"]

/**
 * What the participant sees when they open the link they were emailed. Four
 * answers, and the page renders exactly one of them.
 */
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
      "p.id",
      "p.status",
      "p.base_amount",
      "p.amount",
      "p.method",
      "p.installment_count",
      "p.due_at",
      "p.paid_at",
      "p.asaas_invoice_url",
      "e.title as event_title",
      "e.emoji as event_emoji",
      "pr.id as profile_id",
      "pr.cpf",
    ])
    .where("p.id", "=", paymentId)
    .executeTakeFirst()

  // The same answer for "does not exist" and "is not yours": the id is a UUID,
  // and telling the two apart would confirm to whoever guessed one that it is
  // real.
  if (!payment || payment.profile_id !== profileId) {
    throw await redirectWithError(
      paths.dash.DASHBOARD,
      paymentsCopy.page.notYours,
    )
  }

  const eventTitle = payment.event_title ?? ""

  if (SETTLED_STATUSES.includes(payment.status)) {
    return {
      state: "paid",
      eventTitle,
      amount: payment.amount ?? 0,
      paidAt: payment.paid_at ?? "",
    }
  }

  // Pricing an option means reading the Asaas fee table, and with the switch
  // off nothing may talk to Asaas. Quoting from the fallback list instead would
  // name a price no charge could then be created against.
  if (!OPEN_STATUSES.includes(payment.status) || !ENV.PAYMENTS_ENABLED) {
    return { state: "closed", eventTitle }
  }

  if (!isValidCpf(payment.cpf)) {
    return { state: "needs_cpf", paymentId: payment.id, eventTitle }
  }

  const options = buildPaymentOptions(payment.base_amount, await getAsaasFees())

  return {
    state: "ready",
    paymentId: payment.id,
    eventTitle,
    eventEmoji: payment.event_emoji,
    dueAt: payment.due_at,
    options,
    chosen: findChosen(options, payment.method, payment.installment_count),
    invoiceUrl: payment.asaas_invoice_url,
  }
}

/**
 * The option matching what the participant already picked, so the page comes
 * back with their choice selected rather than falling back to the default.
 */
function findChosen(
  options: PaymentOption[],
  method: string | null,
  installmentCount: number | null,
): PaymentOption | null {
  if (method === "pix") {
    return options.find((option) => option.id === "pix") ?? null
  }
  if (method === "credit_card" && installmentCount) {
    return (
      options.find(
        (option) => option.installmentCount === installmentCount,
      ) ?? null
    )
  }
  return null
}
