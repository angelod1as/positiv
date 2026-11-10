import { paymentsCopy } from "~/copy/payments"
import type { ProviderErrorContext } from "../../payment-provider"
import { AsaasError } from "./asaas-client.server"

const { providerErrors } = paymentsCopy

// Refusals Asaas words the same way every time, matched on its code and a
// phrase of its description: the code alone is too broad -- invalid_action
// covers a dozen different refusals.
const KNOWN_REFUSALS: {
  context: ProviderErrorContext
  code: string
  phrase: RegExp
  message: string
}[] = [
  {
    context: "checkout",
    code: "invalid_cpfCnpj",
    phrase: /./,
    message: providerErrors.checkoutCpf,
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
  context: ProviderErrorContext,
): string {
  if (error instanceof AsaasError) {
    if (error.status >= 500 || error.status === 401 || error.status === 403) {
      return providerErrors.unavailable
    }

    for (const refusal of KNOWN_REFUSALS) {
      const matched = error.errors.some(
        (entry) =>
          entry.code === refusal.code && refusal.phrase.test(entry.description),
      )
      if (refusal.context === context && matched) return refusal.message
    }

    const [first] = error.errors
    if (!first) return providerErrors.unavailable
    if (context === "sync") return providerErrors.syncRefused("Asaas", first.description)
    return providerErrors.checkoutRefused(first.description)
  }

  // fetch rejects with a TypeError when the connection fails, and the timeout
  // in asaasRequest aborts with an AbortError.
  if (
    error instanceof TypeError ||
    (error instanceof DOMException && error.name === "AbortError")
  ) {
    return providerErrors.unavailable
  }

  return error instanceof Error ? error.message : String(error)
}
