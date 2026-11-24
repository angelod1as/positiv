import {
  cancelManualPayment,
  editManualPayment,
  registerManualPayment,
} from "./manual-payment.server"
import { createPaymentOffer, resendPaymentOffer } from "./payment-offer.server"
import { cancelPayment } from "./payment-cancel.server"
import { syncPaymentFromProvider } from "./payment-sync.server"
import { markManualRefunded } from "./payment-refund.server"
import { can, PERMISSIONS } from "~/business/auth/permissions"
import { errorsCopy } from "~/copy/errors"

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

type Actor =
  | { id: string; permissions?: readonly string[] | null }
  | null
  | undefined


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

type Values = Record<string, FormDataEntryValue>

/**
 * Every payment intent and what answers it. The permission check reads this
 * same map, so an intent cannot be added without it.
 */
const PAYMENT_HANDLERS: Record<
  string,
  (values: Values, createdBy: string | undefined) => Promise<ComposableResult>
> = {
  "payment-offer": (values, createdBy) =>
    createPaymentOffer({ ...values, createdBy }),
  "payment-resend": (values) => resendPaymentOffer(values),
  "payment-sync": (values) => syncPaymentFromProvider(values),
  "payment-manual": (values, createdBy) =>
    registerManualPayment({ ...values, createdBy }),
  "payment-manual-edit": (values) => editManualPayment(values),
  "payment-manual-cancel": (values) => cancelManualPayment(values),
  "payment-manual-refund": (values) => markManualRefunded(values),
  "payment-cancel": (values) => cancelPayment(values),
}

/**
 * The payment intents the modal posts, answered the same way wherever it was
 * opened from. Both admin routes own a page the modal appears on, and their
 * copies of this would have to change together every time a guard does.
 *
 * Answers null for anything that is not a payment intent, so a route can carry
 * on to its own. Entering the admin area is not enough to touch money: every
 * intent asks for payments.manage here, whichever route posted it.
 */
export async function handlePaymentIntent(
  intent: string,
  formData: FormData,
  actor: Actor,
): Promise<PaymentIntentResult | null> {
  const handler = Object.hasOwn(PAYMENT_HANDLERS, intent)
    ? PAYMENT_HANDLERS[intent]
    : undefined
  if (!handler) return null

  if (!can(actor, PERMISSIONS.PAYMENTS_MANAGE)) {
    return {
      success: false,
      intent,
      errors: [{ message: errorsCopy.auth.paymentsPermissionRequired }],
    }
  }

  return toIntentResult(
    intent,
    await handler(Object.fromEntries(formData), actor?.id),
  )
}
