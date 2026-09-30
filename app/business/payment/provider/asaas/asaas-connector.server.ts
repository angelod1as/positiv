import { ENV } from "varlock/env"
import type { PaymentProvider, ProviderRefund } from "../../payment-provider"
import {
  asaasDashboardOrigin,
  createAsaasCustomer,
  createAsaasPayment,
  deleteAsaasPayment,
  findAsaasCustomerByCpf,
  getAsaasInstallmentRefunds,
  getAsaasPaymentRefunds,
  reaisToCents,
} from "./asaas-client.server"

export const asaasConnector: PaymentProvider = {
  name: "Asaas",

  isConfigured: () =>
    Boolean(ENV.ASAAS_API_URL && ENV.ASAAS_API_KEY && ENV.ASAAS_WEBHOOK_TOKEN),

  // Asaas does not dedupe customers by CPF on its side, so without the lookup
  // every charge would leave another customer behind for the same person.
  findOrCreateCustomer: async (input) =>
    (await findAsaasCustomerByCpf(input.cpf)) ??
    (await createAsaasCustomer({
      name: input.name,
      cpf: input.cpf,
      email: input.email,
      mobilePhone: input.phone,
      externalReference: input.profileId,
    })),

  createCharge: async (input) => {
    const payment = await createAsaasPayment({
      customerId: input.customerId,
      method: input.method,
      amount: input.amount,
      installmentCount: input.installmentCount,
      dueDate: input.dueDate,
      description: input.description,
      externalReference: input.reference,
      successUrl: input.successUrl,
    })

    return {
      chargeId: payment.id,
      planId: payment.installmentId,
      checkoutUrl: payment.invoiceUrl,
      dashboardRef: payment.invoiceNumber,
    }
  },

  // Asaas answers a refusal with `deleted: false` and a 200, not an error.
  cancelCharge: (chargeId) => deleteAsaasPayment(chargeId),

  // A plan is refunded through the plan, and Asaas lists each installment's
  // share there -- including one still "em progresso" that no charge event has
  // reported.
  fetchRefunds: async ({ chargeId, planId }) =>
    asaasRefunds(
      planId
        ? await getAsaasInstallmentRefunds(planId)
        : await getAsaasPaymentRefunds(chargeId),
    ),

  // No admin page is known for a card plan, so a plan links to its first
  // charge, and a charge with no number to the payments list.
  chargeDashboardUrl: (dashboardRef) =>
    dashboardRef
      ? `${asaasDashboardOrigin()}/payment/show/${dashboardRef}`
      : `${asaasDashboardOrigin()}/payment/list`,
}

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
