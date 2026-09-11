import { applySchema } from "composable-functions"
import { paymentsCopy } from "~/copy/payments"
import { kyselyDb } from "~/kysely-db"
import { zod } from "~/lib/helpers/zod"
import { isValidCpf, normalizeCpf } from "./cpf"

export const savePaymentCpfSchema = zod.object({
  profileId: zod.string().uuid(),
  cpf: zod
    .string()
    .refine(isValidCpf, { error: paymentsCopy.errors.invalidCpf })
    .transform(normalizeCpf),
})

/**
 * The CPF gate on the payment page. Asaas will not take a customer without one,
 * so this is the only way past the gate — and it is saved to the profile rather
 * than to the charge, because the person is the same person at the next event.
 */
export const savePaymentCpf = applySchema(savePaymentCpfSchema)(
  async (values) => {
    await kyselyDb
      .updateTable("profiles")
      .set({ cpf: values.cpf })
      .where("id", "=", values.profileId)
      .execute()

    return { saved: true }
  },
)
