import { type z } from "zod"
import { zod } from "~/lib/helpers/zod"

// Must mirror MAX_INSTALLMENTS in payment-pricing.server.ts.
// Inlined because this schema is shared with the client and cannot
// import from .server modules.
export const VALID_PAYMENT_OPTIONS = ["PIX", "CC_1", "CC_2", "CC_3", "CC_4"] as const

export const paymentFormSchema = zod.object({
  paymentOption: zod.enum(VALID_PAYMENT_OPTIONS, {
    message: "Selecione uma forma de pagamento válida",
  }),
})

export type PaymentFormData = z.infer<typeof paymentFormSchema>
