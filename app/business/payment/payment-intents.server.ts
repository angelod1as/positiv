import { registerManualPayment } from "./manual-payment.server"
import { createPaymentOffer, resendPaymentOffer } from "./payment-offer.server"
import { cancelPayment } from "./payment-cancel.server"
import { markManualRefunded } from "./payment-refund.server"

type PaymentIntentResult = {
  success: boolean
  intent: string
  errors?: { message: string }[]
  /**
   * False when the charge is there but the participant was not told about it.
   * Opening one is two acts -- a row and an email -- and only the first is
   * undoable, so a failed email is reported rather than raised.
   */
  emailSent?: boolean
}

type ComposableResult =
  | { success: true; data?: Record<string, unknown> }
  | { success: false; errors: { message: string }[] }


/**
 * composable-functions answers with Error instances, and React Router replaces
 * every Error in action data with "Unexpected Server Error" once the build is a
 * production one — so the sentences these guards raise would only ever be read
 * in `pnpm dev`. Copying the message out keeps them.
 */
const toIntentResult = (
  intent: string,
  result: ComposableResult,
): PaymentIntentResult => ({
  success: result.success,
  intent,
  errors: result.success
    ? undefined
    : result.errors.map((error) => ({ message: error.message })),
  // Only the two intents that send one carry it; the rest answer nothing and
  // the modal stays quiet.
  emailSent:
    result.success && typeof result.data?.emailSent === "boolean"
      ? result.data.emailSent
      : undefined,
})

/**
 * The payment intents the modal posts, answered the same way wherever it was
 * opened from. Both admin routes own a page the modal appears on, and their
 * copies of this would have to change together every time a guard does.
 *
 * Answers null for anything that is not a payment intent, so a route can carry
 * on to its own.
 */
export async function handlePaymentIntent(
  intent: string,
  formData: FormData,
  createdBy: string | undefined,
): Promise<PaymentIntentResult | null> {
  const values = Object.fromEntries(formData)

  if (intent === "payment-offer") {
    return toIntentResult(
      intent,
      await createPaymentOffer({ ...values, createdBy }),
    )
  }

  if (intent === "payment-resend") {
    return toIntentResult(intent, await resendPaymentOffer(values))
  }

  if (intent === "payment-manual") {
    return toIntentResult(
      intent,
      await registerManualPayment({ ...values, createdBy }),
    )
  }

  if (intent === "payment-manual-refund") {
    return toIntentResult(intent, await markManualRefunded(values))
  }

  if (intent === "payment-cancel") {
    return toIntentResult(intent, await cancelPayment(values))
  }

  return null
}
