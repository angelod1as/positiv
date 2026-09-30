/**
 * What the payment domain needs from whoever holds the money. Business code
 * talks to this and never to a provider's API: swapping providers means writing
 * one connector, not touching the checkout, the refunds or the webhook.
 *
 * Amounts are always cents. Ids are the provider's own, stored as opaque
 * strings.
 */
export type PaymentProvider = {
  /** The provider's name as admins know it, for the copy. */
  name: string
  /** Whether the secrets the provider needs are all set in this environment. */
  isConfigured(): boolean
  /** The provider's customer for this person: found by CPF, else created. */
  findOrCreateCustomer(input: CustomerInput): Promise<string>
  createCharge(input: ChargeInput): Promise<CreatedCharge>
  /** Calls off an unpaid charge. False when the provider refused. */
  cancelCharge(chargeId: string): Promise<boolean>
  /**
   * Every refund of a charge as the provider lists it now -- a card plan's
   * from the plan. Refunds are done in the provider's dashboard; the site only
   * reads them.
   */
  fetchRefunds(charge: { chargeId: string; planId: string | null }): Promise<
    ProviderRefund[]
  >
  /** Where an admin sees this charge in the provider's own dashboard. */
  chargeDashboardUrl(dashboardRef: string | null): string
}

/**
 * One refund, in cents. Only `done` is money back; `pending` is on its way and
 * `cancelled` never will be.
 */
export type ProviderRefund = {
  amount: number
  state: "done" | "pending" | "cancelled"
}

export type CustomerInput = {
  profileId: string
  name: string
  cpf: string
  email: string
  phone?: string
}

export type ProviderPaymentMethod = "pix" | "credit_card"

export type ChargeInput = {
  customerId: string
  method: ProviderPaymentMethod
  amount: number
  installmentCount: number | null
  dueDate: Date
  description: string
  /** Our payments.id, so an event about the charge can find its row. */
  reference: string
  /** Where to send the participant once they paid, when there is one. */
  successUrl: string | null
}

export type CreatedCharge = {
  chargeId: string
  /** Set when the provider bills a card plan as one charge per installment. */
  planId: string | null
  /** The page the participant pays on. */
  checkoutUrl: string | null
  /** What chargeDashboardUrl needs to link the admin to the charge. */
  dashboardRef: string | null
}
