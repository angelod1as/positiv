import { siteSnapshotCache } from "~/business/cms/site-snapshot-cache.server"
import type { SiteSnapshot } from "~/business/cms/site-snapshot.server"
import { logger } from "~/lib/logger/logger.server"

export const PAYMENT_MESSAGES_TIMEOUT_MS = 2_000

// Kept in step with the seed by a test against the committed e2e fixture, so a
// Sanity outage copies the same message the Studio would have served.
export const DEFAULT_WHATSAPP_PAYMENT_MESSAGE = [
  "Oi, {{nome}}! Aqui está o link para o pagamento da {{evento}}:",
  "",
  "{{link}}",
  "",
  "Formas de pagamento:",
  "{{formas}}",
  "",
  "O link vale até {{data}}.",
].join("\n")

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
