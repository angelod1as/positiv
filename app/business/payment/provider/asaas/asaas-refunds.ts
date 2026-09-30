import type { ProviderRefund } from "../../payment-provider"
import { reaisToCents } from "~/lib/helpers/format-currency"

/** One entry of Asaas's `refunds` list, on a charge or on a whole plan. */
export type AsaasRefund = { value?: number | null; status?: string | null }

/**
 * Only DONE is money back: "a existência do array refunds não significa que o
 * valor já foi devolvido" (docs, Estornos). CANCELLED never will be. Anything
 * else -- PENDING, the AWAITING_* authorisations, or a status we do not know
 * -- is on its way, and never counted as given back on a guess.
 */
export const asaasRefunds = (entries: AsaasRefund[]): ProviderRefund[] =>
  entries.map((entry) => ({
    amount: reaisToCents(entry.value ?? 0),
    state:
      entry.status === "DONE"
        ? "done"
        : entry.status === "CANCELLED"
          ? "cancelled"
          : "pending",
  }))
