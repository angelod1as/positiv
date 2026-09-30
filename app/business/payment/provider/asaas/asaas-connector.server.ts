import { ENV } from "varlock/env"
import type { PaymentProvider } from "../../payment-provider"
import {
  asaasDashboardOrigin,
  createAsaasCustomer,
  createAsaasPayment,
  deleteAsaasPayment,
  findAsaasCustomerByCpf,
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

  // No admin page is known for a card plan, so a plan links to its first
  // charge, and a charge with no number to the payments list.
  chargeDashboardUrl: (dashboardRef) =>
    dashboardRef
      ? `${asaasDashboardOrigin()}/payment/show/${dashboardRef}`
      : `${asaasDashboardOrigin()}/payment/list`,
}
