import { kyselyDb } from "~/kysely-db"
import { appOrigin } from "~/lib/helpers/app-origin"
import { paymentLogger as logger } from "~/business/payment/payment-logger.server"
import paths from "~/lib/paths"
import { paymentProvider } from "./payment-provider.server"

/**
 * What an alert about a payment may say. Named field by field, never spread
 * from a query, because the alert reaches a Telegram group and the rows it is
 * built from often carry the participant's name, CPF, e-mail and phone.
 */
export type PaymentAlertRow = {
  paymentId: string
  profileId: string
  eventId: string
  eventTitle: string | null
  status: string
  method: string | null
  installmentCount: number | null
  amount: number | null
  // Typed as a string, but pg hands a timestamptz back as a Date.
  dueAt: string | Date
  providerChargeId: string | null
  providerCustomerId: string | null
}

/** What the call that failed was trying, when it differs from the row. */
export type PaymentAlertAttempt = {
  method?: string | null
  installmentCount?: number | null
  amount?: number | null
  customerId?: string | null
}

export type PaymentAlertContext = ReturnType<typeof paymentAlertContext>

export function paymentAlertContext(
  row: PaymentAlertRow,
  attempt: PaymentAlertAttempt = {},
) {
  const customerId = attempt.customerId ?? row.providerCustomerId
  const provider = paymentProvider()

  const links: Record<string, string> = {
    "Payment in the admin": `${appOrigin(null)}${paths.admin.events.ADMIN_EVENT_VIEW_PARTICIPANT(row.eventId, row.profileId)}`,
  }
  if (customerId) {
    links[`Customer in ${provider.name}`] = provider.customerDashboardUrl(customerId)
  }

  return {
    profileId: row.profileId,
    paymentId: row.paymentId,
    eventId: row.eventId,
    eventTitle: row.eventTitle,
    method: attempt.method !== undefined ? attempt.method : row.method,
    installmentCount:
      attempt.installmentCount !== undefined
        ? attempt.installmentCount
        : row.installmentCount,
    amount: attempt.amount !== undefined ? attempt.amount : row.amount,
    customerId,
    dueDate: new Date(row.dueAt).toISOString(),
    statusBefore: row.status,
    previousChargeId: row.providerChargeId,
    links,
  }
}

/**
 * The one entry a provider failure on a payment gets. The provider's client
 * does not log, so this is the only place it shows.
 */
export function logPaymentProviderFailure(
  message: string,
  context: { paymentId: string } & Record<string, unknown>,
  error: unknown,
) {
  logger.error(message, {
    ...context,
    provider: paymentProvider().errorDetails(error),
  })
}

/**
 * The payment as an alert describes it, read only once something has failed.
 * By then the row may have changed -- a cancelled charge reads cancelled -- so
 * its status is `status`, not `statusBefore`. A failure to read it must not
 * cost the alert, so it answers with just the id.
 */
export async function readPaymentAlertContext(
  paymentId: string,
): Promise<{ paymentId: string } & Record<string, unknown>> {
  try {
    const row = await kyselyDb
      .selectFrom("payments as p")
      .innerJoin("event_participants as ep", "ep.id", "p.event_participant_id")
      .innerJoin("events as e", "e.id", "ep.event_id")
      .innerJoin("profiles as pr", "pr.id", "ep.profile_id")
      .select([
        "p.id as paymentId",
        "pr.id as profileId",
        "e.id as eventId",
        "e.title as eventTitle",
        "p.status",
        "p.method",
        "p.installment_count as installmentCount",
        "p.amount",
        "p.due_at as dueAt",
        "p.provider_charge_id as providerChargeId",
        "p.provider_customer_id as providerCustomerId",
      ])
      .where("p.id", "=", paymentId)
      .executeTakeFirst()

    if (!row) return { paymentId }
    const { statusBefore, ...context } = paymentAlertContext(row)
    return { ...context, status: statusBefore }
  } catch (error) {
    logger.warn("Could not read the payment for an alert", {
      paymentId,
      error: error instanceof Error ? error.message : String(error),
    })
    return { paymentId }
  }
}
