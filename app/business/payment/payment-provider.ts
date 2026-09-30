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
  fetchRefunds(charge: {
    chargeId: string
    planId: string | null
  }): Promise<ProviderRefund[]>
  /** Where an admin sees this charge in the provider's own dashboard. */
  chargeDashboardUrl(dashboardRef: string | null): string
  /**
   * What a person reads when a call to the provider fails. The technical
   * detail stays in the log; anything that is not the provider's is the app's
   * own sentence and passes through as it is.
   */
  errorMessage(error: unknown, context: ProviderErrorContext): string
  /**
   * Authenticates a webhook delivery and translates it into our own event.
   * Refusals carry the HTTP status to answer with.
   */
  readWebhook(request: Request): Promise<WebhookReading>
}

export type WebhookReading =
  | { ok: true; event: PaymentEvent; payload: unknown }
  | { ok: false; status: 400 | 401 | 503; error: string }

/**
 * What a provider's webhook means for a payment, in our terms. Amounts are
 * cents; `providerType` is the provider's own name for the event, kept for the
 * inbox and the logs.
 */
export type PaymentEvent = {
  eventId: string
  providerType: string
  chargeId: string | null
  /** The card plan the charge belongs to, when it is billed per installment. */
  planId: string | null
  /** Our payments.id, when the provider carried it back. */
  reference: string | null
} & (
  | { type: "paid"; amount: number | null }
  | { type: "overdue" | "cancelled" | "restored" | "refund_in_progress" }
  | { type: "updated"; amount: number | null; dueAt: string | null }
  | {
      type: "refunded" | "partially_refunded"
      /** Null when the provider did not say how much moved. */
      refunds: ProviderRefund[] | null
    }
  | { type: "refund_denied"; reason: string | null }
  /** A chargeback or a refused capture: needs a person, not a status. */
  | { type: "alarm" }
  | { type: "ignored" }
)

export type ProviderErrorContext = "checkout" | "sync"

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
