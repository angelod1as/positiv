import { ENV } from "varlock/env"
import type { PaymentProvider } from "../../payment-provider"
import {
  AsaasError,
  asaasDashboardOrigin,
  createAsaasCustomer,
  createAsaasPayment,
  deleteAsaasPayment,
  findAsaasCustomerByCpf,
  getAsaasInstallmentRefunds,
  getAsaasPaymentRefunds,
} from "./asaas-client.server"
import { asaasErrorMessage } from "./asaas-error-message"
import { asaasRefunds } from "./asaas-refunds"
import { readAsaasWebhook } from "./asaas-webhook.server"

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

  // Asaas takes a plan's total and an installment count, truncates each
  // installment to the cent and charges the difference on the last one.
  splitInstallments: (total, count) => {
    const each = Math.floor(total / count)
    return [...Array(count - 1).fill(each), total - each * (count - 1)]
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

  customerDashboardUrl: (customerId) =>
    `${asaasDashboardOrigin()}/customerAccount/show/${customerId}`,

  errorMessage: asaasErrorMessage,

  errorDetails: (error) =>
    error instanceof AsaasError
      ? {
          method: error.method,
          path: error.path,
          status: error.status,
          errors: error.errors,
        }
      : { error: error instanceof Error ? error.message : String(error) },

  readWebhook: readAsaasWebhook,
}
