import type { z } from "zod"
import { unknownVariables } from "~/business/payment/payment-message"
import { zod } from "~/lib/helpers/zod"

export const paymentMessagesSchema = zod.object({
  whatsappMessage: zod
    .string()
    .refine((template) => unknownVariables(template).length === 0, {
      error:
        "The WhatsApp payment message uses an unknown {{variable}} outside the documented set",
    }),
})

export type PaymentMessages = z.output<typeof paymentMessagesSchema>
