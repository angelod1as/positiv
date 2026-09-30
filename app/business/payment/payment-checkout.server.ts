import { applySchema } from "composable-functions"
import { sql } from "kysely"
import type { z } from "zod"
import { paymentsCopy } from "~/copy/payments"
import { kyselyDb } from "~/kysely-db"
import { appOrigin } from "~/lib/helpers/app-origin"
import { isProd } from "~/lib/helpers/is-prod.server"
import { zod } from "~/lib/helpers/zod"
import { logger } from "~/lib/logger/logger.server"
import paths from "~/lib/paths"
import {
  isCardPaymentsEnabled,
  isOnlinePaymentsEnabled,
} from "~/business/settings/app-settings.server"
import {
  createAsaasCustomer,
  createAsaasPayment,
  deleteAsaasPayment,
  findAsaasCustomerByCpf,
} from "./asaas-client.server"
import { asaasErrorMessage } from "./asaas-error-message"
import { ACTIVE_PAYMENT_STATUSES } from "./payment-totals.server"
import { isValidCpf } from "~/lib/helpers/cpf"
import { isUniqueViolation } from "~/lib/helpers/is-unique-violation"
import { buildPaymentOptions, findPaymentOption } from "./pricing"

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

  // Written only while the column is still empty, for the same reason the
  // charge below is: two picks racing both find nothing and both create a
  // customer, and an unconditional write would let the row and the profile end
  // up naming different ones.
  const written = await kyselyDb
    .updateTable("profiles")
    .set({ asaas_customer_id: customerId })
    .where("id", "=", profile.id)
    .where("asaas_customer_id", "is", null)
    .returning("asaas_customer_id")
    .executeTakeFirst()
    .catch((error: unknown) => {
      // The customer Asaas holds for this CPF is already another profile's --
      // one that carried the CPF before. Which of them it belongs to is a
      // question for a person, and charging either on a guess is worse.
      if (isUniqueViolation(error, "profiles_asaas_customer_id")) {
        throw new Error(paymentsCopy.errors.customerTaken)
      }
      throw error
    })

  if (written?.asaas_customer_id) return written.asaas_customer_id

  // Another pick got there first. Its customer is the one every charge must
  // name, so the one created here is abandoned at Asaas: it holds no money, is
  // attached to no charge, and the API offers no delete for it.
  const winner = await kyselyDb
    .selectFrom("profiles")
    .select("asaas_customer_id")
    .where("id", "=", profile.id)
    .executeTakeFirst()

  return winner?.asaas_customer_id ?? customerId
}

/**
 * The participant picks how to pay, and only then does a charge exist at Asaas.
 * The price is frozen on the row here: switching card payments later leaves a
 * charge already created at the figure it was created at.
 */
async function pick(values: z.infer<typeof pickOptionSchema>) {
  if (!(await isOnlinePaymentsEnabled())) {
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

  if (!(ACTIVE_PAYMENT_STATUSES as readonly string[]).includes(payment.status)) {
    throw new Error(paymentsCopy.errors.chargeClosed)
  }

  // The page gates on this before it offers an option, but the action is
  // reachable on its own. Refused here with the sentence the gate uses, rather
  // than as whatever Asaas answers to a customer it will not accept.
  if (!isValidCpf(payment.cpf)) {
    throw new Error(paymentsCopy.errors.invalidCpf)
  }

  const option = findPaymentOption(
    buildPaymentOptions(payment.base_amount, {
      cardEnabled: await isCardPaymentsEnabled(),
    }),
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
      asaas_customer_id: customerId,
      asaas_payment_id: charge.id,
      asaas_installment_id: charge.installmentId,
      asaas_invoice_url: charge.invoiceUrl,
      asaas_invoice_number: charge.invoiceNumber,
    })
    .where("id", "=", payment.id)
    .where("status", "in", [...ACTIVE_PAYMENT_STATUSES])
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
}

// Everything above can fail at Asaas, and what reaches the participant is a
// sentence, not "Asaas 400 on /customers" or "fetch failed". The detail is in
// the log already.
export const pickOption = applySchema(pickOptionSchema)(async (values) => {
  try {
    return await pick(values)
  } catch (error) {
    throw new Error(asaasErrorMessage(error, "checkout"))
  }
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
    .where("status", "in", [...ACTIVE_PAYMENT_STATUSES])
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
