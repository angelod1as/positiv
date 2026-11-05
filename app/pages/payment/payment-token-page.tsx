import { redirect } from "react-router"
import { redirectWithError } from "remix-toast"
import { pickOption } from "~/business/payment/payment-checkout.server"
import {
  isCardPaymentsEnabled,
  isOnlinePaymentsEnabled,
} from "~/business/settings/app-settings.server"
import { metaCopy } from "~/copy/meta"
import { paymentsCopy } from "~/copy/payments"
import { createMetaArray } from "~/lib/helpers/meta"
import paths from "~/lib/paths"
import type { Route } from "./+types/payment-token-page"
import PaymentPage from "./payment-page"
import {
  findPaymentByToken,
  loadPaymentPageByToken,
} from "./payment-page.server"

const { errors } = paymentsCopy

export function meta({}: Route.MetaArgs) {
  return [
    ...createMetaArray(metaCopy.payment.title),
    { name: "robots", content: "noindex, nofollow" },
  ]
}

/**
 * The token in the URL is the whole authorization, so it must not leave in a
 * Referer nor sit in a shared cache.
 */
export function headers({}: Route.HeadersArgs) {
  return {
    "Referrer-Policy": "no-referrer",
    "Cache-Control": "private, no-store",
  }
}

/**
 * The link the participant was sent. No session is read: the token decides,
 * so a signed-out payer, or somebody else signed in, can still pay the bill.
 */
export async function loader({ params }: Route.LoaderArgs) {
  return loadPaymentPageByToken({
    token: params.token,
    onlinePaymentsEnabled: await isOnlinePaymentsEnabled(),
    cardPaymentsEnabled: await isCardPaymentsEnabled(),
  })
}

export async function action({ params, request }: Route.ActionArgs) {
  const { paymentId, profileId, eventStarted } = await findPaymentByToken(
    params.token,
  )
  const back = paths.payment.PAYMENT_TOKEN(params.token)

  if (eventStarted) {
    return redirectWithError(back, errors.chargeClosed)
  }

  const formData = await request.formData()
  const result = await pickOption({
    paymentId,
    profileId,
    optionId: String(formData.get("optionId") ?? ""),
  })

  if (!result.success) {
    return redirectWithError(
      back,
      result.errors[0]?.message ?? errors.generic,
    )
  }

  // The provider hosts the checkout, so this leaves the app on purpose.
  return redirect(result.data.invoiceUrl)
}

export default PaymentPage
