import { type z } from "zod"
import { zod } from "~/lib/helpers/zod"
import { MAX_INSTALLMENTS } from "./payment-pricing.server"

const validOptions = [
  "PIX",
  ...Array.from({ length: MAX_INSTALLMENTS }, (_, i) => `CC_${i + 1}`),
] as const

export const VALID_PAYMENT_OPTIONS = validOptions

export const paymentFormSchema = zod.object({
  paymentOption: zod.enum(
    validOptions as unknown as [string, ...string[]],
    { message: "Selecione uma forma de pagamento válida" },
  ),
})

export type PaymentFormData = z.infer<typeof paymentFormSchema>
