export type ValidatePaymentTokenResult =
  | { status: "not_found" }
  | { status: "expired"; data: { eventTitle: string; eventEmoji: string | null } }
  | { status: "already_paid"; data: { eventTitle: string; eventEmoji: string | null } }
  | { status: "no_valid_charges"; data: { eventTitle: string; eventEmoji: string | null } }
  | {
      status: "success"
      data: {
        eventTitle: string
        eventEmoji: string | null
        participantName: string
        paymentOptions: PaymentOption[]
      }
    }

export interface PaymentOption {
  method: string
  amount: number
  invoiceUrl: string
  installments?: number | null
}

export async function validatePaymentToken(
  _token: string
): Promise<ValidatePaymentTokenResult> {
  return { status: "not_found" }
}
