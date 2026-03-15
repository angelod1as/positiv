export type AsaasEnvironment = "sandbox" | "production"

export interface AsaasConfig {
  apiKey: string
  environment: AsaasEnvironment
}

export type AsaasBillingType =
  | "UNDEFINED"
  | "BOLETO"
  | "CREDIT_CARD"
  | "DEBIT_CARD"
  | "TRANSFER"
  | "DEPOSIT"
  | "PIX"

export type AsaasPaymentStatus =
  | "PENDING"
  | "RECEIVED"
  | "CONFIRMED"
  | "OVERDUE"
  | "REFUNDED"
  | "RECEIVED_IN_CASH"
  | "REFUND_REQUESTED"
  | "REFUND_IN_PROGRESS"
  | "CHARGEBACK_REQUESTED"
  | "CHARGEBACK_DISPUTE"
  | "AWAITING_CHARGEBACK_REVERSAL"
  | "DUNNING_REQUESTED"
  | "DUNNING_RECEIVED"
  | "AWAITING_RISK_ANALYSIS"

export type PaymentMethod = "pix" | "credit_card"

export type PaymentTransactionStatus =
  | "pending"
  | "confirmed"
  | "failed"
  | "refunded"
  | "cancelled"

export interface CreateAsaasCustomerParams {
  name: string
  cpfCnpj: string
  email?: string
  phone?: string
  mobilePhone?: string
  externalReference?: string
  notificationDisabled?: boolean
}

export interface AsaasCustomer {
  object: "customer"
  id: string
  dateCreated: string
  name: string
  email: string | null
  phone: string | null
  mobilePhone: string | null
  cpfCnpj: string
  personType: "FISICA" | "JURIDICA"
  deleted: boolean
  externalReference: string | null
  notificationDisabled: boolean
}

export interface CreateAsaasChargeParams {
  customer: string
  billingType: AsaasBillingType
  value: number
  dueDate: string
  description?: string
  installmentCount?: number
  installmentValue?: number
  totalValue?: number
  externalReference?: string
  callback?: {
    successUrl: string
    autoRedirect?: boolean
  }
}

export interface AsaasPayment {
  object: "payment"
  id: string
  dateCreated: string
  customer: string
  subscription: string | null
  installment: string | null
  paymentLink: string | null
  value: number
  netValue: number
  originalValue: number | null
  interestValue: number | null
  billingType: AsaasBillingType
  status: AsaasPaymentStatus
  dueDate: string
  originalDueDate: string
  paymentDate: string | null
  clientPaymentDate: string | null
  creditDate: string | null
  estimatedCreditDate: string | null
  description: string | null
  externalReference: string | null
  installmentNumber: number | null
  invoiceUrl: string
  transactionReceiptUrl: string | null
  deleted: boolean
  anticipated: boolean
  anticipable: boolean
  bankSlipUrl: string | null
  nossoNumero: string | null
  creditCard?: {
    creditCardNumber: string
    creditCardBrand: string
    creditCardToken: string
  }
}

export interface AsaasListResponse<T> {
  object: "list"
  hasMore: boolean
  totalCount: number
  limit: number
  offset: number
  data: T[]
}

export interface AsaasPixQrCode {
  encodedImage: string
  payload: string
  expirationDate: string
}

export interface RefundAsaasPaymentParams {
  value?: number
  description?: string
}

export type AsaasWebhookEvent =
  | "PAYMENT_CREATED"
  | "PAYMENT_AWAITING_RISK_ANALYSIS"
  | "PAYMENT_APPROVED_BY_RISK_ANALYSIS"
  | "PAYMENT_REPROVED_BY_RISK_ANALYSIS"
  | "PAYMENT_AUTHORIZED"
  | "PAYMENT_UPDATED"
  | "PAYMENT_CONFIRMED"
  | "PAYMENT_RECEIVED"
  | "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED"
  | "PAYMENT_ANTICIPATED"
  | "PAYMENT_OVERDUE"
  | "PAYMENT_DELETED"
  | "PAYMENT_RESTORED"
  | "PAYMENT_REFUNDED"
  | "PAYMENT_PARTIALLY_REFUNDED"
  | "PAYMENT_REFUND_IN_PROGRESS"
  | "PAYMENT_REFUND_DENIED"
  | "PAYMENT_RECEIVED_IN_CASH_UNDONE"
  | "PAYMENT_CHARGEBACK_REQUESTED"
  | "PAYMENT_CHARGEBACK_DISPUTE"
  | "PAYMENT_AWAITING_CHARGEBACK_REVERSAL"
  | "PAYMENT_DUNNING_RECEIVED"
  | "PAYMENT_DUNNING_REQUESTED"
  | "PAYMENT_BANK_SLIP_CANCELLED"
  | "PAYMENT_BANK_SLIP_VIEWED"
  | "PAYMENT_CHECKOUT_VIEWED"

export interface CreatePaymentChargeParams {
  paymentMethod: PaymentMethod
  customer: string
  dueDate: string
  amount: number
  installments?: number
  description?: string
  externalReference?: string
  callback?: { successUrl: string; autoRedirect?: boolean }
}

export interface AsaasWebhookPayload {
  event: AsaasWebhookEvent
  payment: AsaasPayment
}
