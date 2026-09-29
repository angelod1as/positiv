import { paymentsCopy } from "~/copy/payments"
import { AsaasError } from "./asaas-client.server"

const { asaasErrors } = paymentsCopy

// Refusals Asaas words the same way every time, matched on its code and a
// phrase of its description: the code alone is too broad -- invalid_action
// covers a dozen different refusals.
const KNOWN_REFUSALS: {
  context: "refund" | "checkout"
  code: string
  phrase: RegExp
  message: string
}[] = [
  {
    context: "refund",
    code: "invalid_action",
    phrase: /pr[oó]ximo dia/i,
    message: asaasErrors.refundNextDay,
  },
  {
    context: "refund",
    code: "invalid_action",
    phrase: /saldo/i,
    message: asaasErrors.refundNoBalance,
  },
  {
    context: "refund",
    code: "invalid_value",
    phrase: /excede/i,
    message: asaasErrors.refundTooMuch,
  },
  {
    context: "checkout",
    code: "invalid_cpfCnpj",
    phrase: /./,
    message: asaasErrors.checkoutCpf,
  },
]

/**
 * What a person reads when a call to Asaas fails. The status, the path and the
 * error code are for the log -- asaasRequest has already written them there --
 * and a sentence is for the admin or the participant. A refusal we know gets
 * its own explanation; any other is Asaas's own description, which is written
 * in Portuguese for people. Anything that is not about Asaas is the app's own
 * sentence and passes through as it is.
 */
export function asaasErrorMessage(
  error: unknown,
  context: "refund" | "checkout",
): string {
  if (error instanceof AsaasError) {
    if (error.status >= 500 || error.status === 401 || error.status === 403) {
      return asaasErrors.unavailable
    }

    for (const refusal of KNOWN_REFUSALS) {
      const matched = error.errors.some(
        (entry) =>
          entry.code === refusal.code && refusal.phrase.test(entry.description),
      )
      if (refusal.context === context && matched) return refusal.message
    }

    const [first] = error.errors
    if (!first) return asaasErrors.unavailable
    return context === "refund"
      ? asaasErrors.refundRefused(first.description)
      : asaasErrors.checkoutRefused(first.description)
  }

  // fetch rejects with a TypeError when the connection fails, and the timeout
  // in asaasRequest aborts with an AbortError.
  if (
    error instanceof TypeError ||
    (error instanceof DOMException && error.name === "AbortError")
  ) {
    return asaasErrors.unavailable
  }

  return error instanceof Error ? error.message : String(error)
}
