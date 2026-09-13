import { applySchema } from "composable-functions"
import { sql } from "kysely"
import { paymentsCopy } from "~/copy/payments"
import { kyselyDb } from "~/kysely-db"
import { appOrigin } from "~/lib/helpers/app-origin"
import { isProd } from "~/lib/helpers/is-prod.server"
import { zod } from "~/lib/helpers/zod"
import { logger } from "~/lib/logger/logger.server"
import paths from "~/lib/paths"
import { ENV } from "varlock/env"
import {
  createAsaasCustomer,
  createAsaasPayment,
  deleteAsaasPayment,
  findAsaasCustomerByCpf,
} from "./asaas-client.server"
import { getAsaasFees } from "./asaas-fees.server"
import { isValidCpf } from "./cpf"
import { buildPaymentOptions, findPaymentOption } from "./pricing"

const OPEN_STATUSES = ["pending", "awaiting_payment"] as const

export const pickOptionSchema = zod.object({
  paymentId: zod.string().uuid(),
  profileId: zod.string().uuid(),
  optionId: zod.string(),
})

/**
 * One Asaas customer per person, reused across events. Asaas does not dedupe by
 * CPF on its side, so without this every charge would leave another customer
 * behind for the same person.
 */
async function ensureAsaasCustomer(profile: {
  id: string
  asaas_customer_id: string | null
  full_name: string | null
  social_name: string | null
  email: string | null
  cpf: string | null
  phone: number | null
}): Promise<string> {
  if (profile.asaas_customer_id) return profile.asaas_customer_id

  const cpf = profile.cpf ?? ""
  const customerId =
    (await findAsaasCustomerByCpf(cpf)) ??
    (await createAsaasCustomer({
      name: profile.full_name || profile.social_name || profile.email || "",
      cpf,
      email: profile.email ?? "",
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

/**
 * The participant picks how to pay, and only then does a charge exist at Asaas.
 * Nothing before this point has quoted a price anybody can be held to, which is
 * also why the fee table is written down here and not when the charge was
 * opened.
 */
export const pickOption = applySchema(pickOptionSchema)(async (values) => {
  if (!ENV.PAYMENTS_ENABLED) {
    throw new Error(paymentsCopy.errors.chargeClosed)
  }

  const payment = await kyselyDb
    .selectFrom("payments as p")
    .innerJoin("event_participants as ep", "ep.id", "p.event_participant_id")
    .innerJoin("events as e", "e.id", "ep.event_id")
    .innerJoin("profiles as pr", "pr.id", "ep.profile_id")
    .select([
      "p.id",
      "p.status",
      "p.base_amount",
      "p.due_at",
      "p.method",
      "p.installment_count",
      "p.asaas_payment_id",
      "p.asaas_invoice_url",
      "e.title as event_title",
      "pr.id as profile_id",
      "pr.asaas_customer_id",
      "pr.full_name",
      "pr.social_name",
      "pr.email",
      "pr.cpf",
      "pr.phone",
    ])
    .where("p.id", "=", values.paymentId)
    .executeTakeFirst()

  if (!payment || payment.profile_id !== values.profileId) {
    throw new Error(paymentsCopy.page.notYours)
  }

  if (!OPEN_STATUSES.some((status) => status === payment.status)) {
    throw new Error(paymentsCopy.errors.chargeClosed)
  }

  // The page gates on this before it offers an option, but the action is
  // reachable on its own. Refused here with the sentence the gate uses, rather
  // than as whatever Asaas answers to a customer it will not accept.
  if (!isValidCpf(payment.cpf)) {
    throw new Error(paymentsCopy.errors.invalidCpf)
  }

  const fees = await getAsaasFees()
  const option = findPaymentOption(
    buildPaymentOptions(payment.base_amount, fees),
    values.optionId,
  )
  if (!option) {
    throw new Error(paymentsCopy.errors.unknownOption)
  }

  // The same option, with a charge already created for it: hand back the
  // invoice rather than opening a second one because somebody double-clicked.
  const sameOption =
    payment.method === option.method &&
    payment.installment_count === option.installmentCount
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

  // Asaas refuses a callback whose domain does not match the commercial data on
  // the account, and fails the whole charge with invalid_callback rather than
  // just dropping the redirect. Only production has a domain that matches, so
  // everywhere else sends none and the participant stays on the Asaas page
  // when they are done.
  const origin = isProd() ? appOrigin(null) : ""
  const successUrl = origin
    ? `${origin}${paths.payment.PAYMENT_THANKS(payment.id)}`
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

  // Before the row is touched: a charge with no invoice is one the participant
  // cannot reach, and recording it would leave money able to arrive against a
  // link nobody has. Deleted here rather than left for the next pick to tidy.
  if (!charge.invoiceUrl) {
    await deleteOrphanCharge(payment.id, charge.id)
    throw new Error(paymentsCopy.errors.noInvoiceUrl)
  }

  const updated = await kyselyDb
    .updateTable("payments")
    .set({
      status: "awaiting_payment",
      method: option.method,
      installment_count: option.installmentCount,
      amount: option.total,
      fee_snapshot: fees,
      asaas_customer_id: customerId,
      asaas_payment_id: charge.id,
      asaas_installment_id: charge.installmentId,
      asaas_invoice_url: charge.invoiceUrl,
    })
    .where("id", "=", payment.id)
    .where("status", "in", [...OPEN_STATUSES])
    // Compare-and-swap on the charge this call decided against. Without it two
    // picks racing both match -- awaiting_payment is itself an open status --
    // and the loser's charge stays live at Asaas with the row no longer naming
    // it. A row lock would close the race too, but it would be held across the
    // Asaas call above; see the note in payment-offer.server.ts.
    .where(
      sql<boolean>`asaas_payment_id IS NOT DISTINCT FROM ${payment.asaas_payment_id}`,
    )
    .returning("id")
    .executeTakeFirst()

  if (!updated) {
    // Either the row closed under us — an admin cancelled it, the cron expired
    // it — or another pick got there first. Either way the charge just created
    // is one nobody can reach through the app and nothing would ever mark paid,
    // so it must not survive.
    await deleteOrphanCharge(payment.id, charge.id)

    const winner = await readChargeAfterRace(payment.id)
    // Losing to the same option is a double click, not a decision. The invoice
    // handed back is the one the row actually names, so both tabs land on the
    // charge that is being tracked.
    if (
      winner?.asaas_invoice_url &&
      winner.method === option.method &&
      winner.installment_count === option.installmentCount
    ) {
      return { invoiceUrl: winner.asaas_invoice_url }
    }

    throw new Error(paymentsCopy.errors.chargeClosed)
  }

  // Only now the replaced one, if the participant changed their mind. Deleting
  // it earlier would leave them with nothing to pay had the new charge failed.
  if (payment.asaas_payment_id && payment.asaas_payment_id !== charge.id) {
    await deleteOrphanCharge(payment.id, payment.asaas_payment_id)
  }

  return { invoiceUrl: charge.invoiceUrl }
})

/**
 * The row as it stands after losing a race, so a double click can be handed the
 * invoice that won rather than an error about a charge that is in fact open.
 */
function readChargeAfterRace(paymentId: string) {
  return kyselyDb
    .selectFrom("payments")
    .select(["method", "installment_count", "asaas_invoice_url"])
    .where("id", "=", paymentId)
    .where("status", "in", [...OPEN_STATUSES])
    .executeTakeFirst()
}

/**
 * A charge the row no longer points at. Asaas answers a refusal with
 * `deleted: false` and a 200, so the return value is the only place it shows.
 */
async function deleteOrphanCharge(paymentId: string, asaasPaymentId: string) {
  try {
    const deleted = await deleteAsaasPayment(asaasPaymentId)
    if (!deleted) {
      logger.error("Asaas refused to delete the charge", {
        paymentId,
        asaasPaymentId,
      })
    }
  } catch (error) {
    logger.error("Could not delete the Asaas charge", {
      paymentId,
      asaasPaymentId,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
