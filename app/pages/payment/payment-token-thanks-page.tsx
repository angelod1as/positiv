import { isOnlinePaymentsEnabled } from "~/business/settings/app-settings.server"
import { metaCopy } from "~/copy/meta"
import { createMetaArray } from "~/lib/helpers/meta"
import type { Route } from "./+types/payment-token-thanks-page"
import { loadPaymentThanksByToken } from "./payment-page.server"
import PaymentThanksPage from "./payment-thanks-page"

export function meta({}: Route.MetaArgs) {
  return [
    ...createMetaArray(metaCopy.paymentThanks.title),
    { name: "robots", content: "noindex, nofollow" },
  ]
}

export function headers({}: Route.HeadersArgs) {
  return {
    "Referrer-Policy": "no-referrer",
    "Cache-Control": "private, no-store",
  }
}

/**
 * Where the provider sends every payer, signed in or not, so the token decides
 * and no session is read. Like the id route, it reads the row and writes
 * nothing.
 */
export async function loader({ params }: Route.LoaderArgs) {
  const data = await loadPaymentThanksByToken({ token: params.token })

  return { ...data, betaNotice: await isOnlinePaymentsEnabled() }
}

export default PaymentThanksPage
