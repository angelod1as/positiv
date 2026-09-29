import { applySchema } from "composable-functions"
import { paymentsCopy } from "~/copy/payments"
import { kyselyDb } from "~/kysely-db"
import { zod } from "~/lib/helpers/zod"
import { isValidCpf, normalizeCpf } from "~/lib/helpers/cpf"
import { isUniqueViolation } from "~/lib/helpers/is-unique-violation"

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
    try {
      await kyselyDb
        .updateTable("profiles")
        .set({ cpf: values.cpf })
        .where("id", "=", values.profileId)
        .execute()
    } catch (error) {
      // One profile per CPF: a second account for the same person is theirs to
      // sort out with the organisation, not something to guess at here.
      if (isUniqueViolation(error, "profiles_cpf_unique")) {
        throw new Error(paymentsCopy.errors.cpfTaken)
      }
      throw error
    }

    return { saved: true }
  },
)
