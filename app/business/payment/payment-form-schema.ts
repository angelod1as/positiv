import { type z } from "zod"
import { zod } from "~/lib/helpers/zod"

export const paymentFormSchema = zod.object({
  paymentOption: zod.string().min(1, "Selecione uma forma de pagamento"),
})

export type PaymentFormData = z.infer<typeof paymentFormSchema>
