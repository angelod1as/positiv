import { formatInTimeZone } from "date-fns-tz"
import { siteSnapshotCache } from "~/business/cms/site-snapshot-cache.server"
import type { SiteSnapshot } from "~/business/cms/site-snapshot.server"
import { paymentsCopy } from "~/copy/payments"
import paths from "~/lib/paths"
import { logger } from "~/lib/logger/logger.server"
import { renderPaymentMessage } from "./payment-message"
import type { PaymentRow } from "./payment-totals.server"
import { buildPaymentOptions } from "./pricing"

export const PAYMENT_MESSAGES_TIMEOUT_MS = 2_000

export const DEFAULT_WHATSAPP_PAYMENT_MESSAGE =
  paymentsCopy.whatsappDefaultMessage

type SnapshotCache = { get(): Promise<SiteSnapshot> }

export async function loadWhatsappPaymentMessage(
  cache: SnapshotCache = siteSnapshotCache,
): Promise<string> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () =>
        reject(new Error(`Sanity took over ${PAYMENT_MESSAGES_TIMEOUT_MS}ms`)),
      PAYMENT_MESSAGES_TIMEOUT_MS,
    )
  })

  try {
    const { paymentMessages } = await Promise.race([cache.get(), timeout])
    return paymentMessages?.whatsappMessage ?? DEFAULT_WHATSAPP_PAYMENT_MESSAGE
  } catch (error) {
    logger.error(
      "Could not load the payment messages, using the default message",
      { error: error instanceof Error ? error.message : String(error) },
    )
    return DEFAULT_WHATSAPP_PAYMENT_MESSAGE
  } finally {
    clearTimeout(timer)
  }
}

function paymentMessageValues(
  active: PaymentRow,
  {
    participantName,
    eventTitle,
    appOrigin,
    cardPaymentsEnabled,
  }: {
    participantName: string
    eventTitle: string
    appOrigin: string
    cardPaymentsEnabled: boolean
  },
) {
  const options = buildPaymentOptions(active.base_amount, {
    cardEnabled: cardPaymentsEnabled,
  })

  return {
    // The origin the server would build, not the request host, so the copied
    // message and the e-mail hand the participant the same link.
    link: `${appOrigin}${paths.payment.PAYMENT(active.id)}`,
    data: formatInTimeZone(active.due_at, "America/Sao_Paulo", "dd/MM/yyyy"),
    nome: participantName,
    evento: eventTitle,
    formas: options.map(paymentsCopy.options.messageLine).join("\n"),
  }
}

export function buildWhatsappPaymentMessage({
  template,
  active,
  participantName,
  eventTitle,
  appOrigin,
  cardPaymentsEnabled,
}: {
  template: string
  active: PaymentRow | null
  participantName: string
  eventTitle: string
  appOrigin: string
  cardPaymentsEnabled: boolean
}): string | null {
  if (!active) return null

  const values = paymentMessageValues(active, {
    participantName,
    eventTitle,
    appOrigin,
    cardPaymentsEnabled,
  })

  try {
    return renderPaymentMessage(template, values)
  } catch (error) {
    logger.error("A payment message template is invalid, using the default", {
      error: error instanceof Error ? error.message : String(error),
    })
    return renderPaymentMessage(DEFAULT_WHATSAPP_PAYMENT_MESSAGE, values)
  }
}
