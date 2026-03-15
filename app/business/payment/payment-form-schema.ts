import { type z } from "zod"
import { zod } from "~/lib/helpers/zod"

export const paymentFormSchema = zod.object({
  billingType: zod.enum(["PIX", "CREDIT_CARD"], {
    message: "Selecione uma forma de pagamento",
  }),
  installmentCount: zod.preprocess(
    (val) => (val === null || val === undefined || val === "" ? 1 : val),
    zod.coerce.number().int().min(1).max(3),
  ),
})

export type PaymentFormData = z.infer<typeof paymentFormSchema>
