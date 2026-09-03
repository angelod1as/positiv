import { registerManualPayment } from "./manual-payment.server"
import { cancelPayment } from "./payment-cancel.server"
import { markManualRefunded } from "./payment-refund.server"

type PaymentIntentResult = {
  success: boolean
  intent: string
  errors?: { message: string }[]
}

type ComposableResult =
  | { success: true }
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
