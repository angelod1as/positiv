import { registerManualPayment } from "./manual-payment.server"
import { cancelPayment } from "./payment-cancel.server"
import { markManualRefunded } from "./payment-refund.server"

type PaymentIntentResult = {
  success: boolean
  intent: string
  errors?: { message: string }[]
}

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
    const result = await registerManualPayment({ ...values, createdBy })
    return {
      success: result.success,
      intent,
      errors: result.success ? undefined : result.errors,
    }
  }

  if (intent === "payment-manual-refund") {
    const result = await markManualRefunded(values)
    return {
      success: result.success,
      intent,
      errors: result.success ? undefined : result.errors,
    }
  }

  if (intent === "payment-cancel") {
    const result = await cancelPayment(values)
    return {
      success: result.success,
      intent,
      errors: result.success ? undefined : result.errors,
    }
  }

  return null
}
