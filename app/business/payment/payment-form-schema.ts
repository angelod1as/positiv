import { type z } from "zod"
import { zod } from "~/lib/helpers/zod"

// Note: this is the scaffold version of the schema. The final design replaces
// `billingType` + `installmentCount` with a single `paymentOption` enum
// (`["PIX", "CC_1", ..., "CC_<MAX_INSTALLMENTS>"]`) so the form mirrors the
// dropdown the user actually sees. See `docs/payment-system-architecture.md`
// §3.9 for the rationale and the constant-drift guard that the unified
// schema requires.
export const paymentFormSchema = zod
  .object({
    billingType: zod.enum(["PIX", "CREDIT_CARD"], {
      message: "Selecione uma forma de pagamento",
    }),
    installmentCount: zod.preprocess(
      (val) => (val === null || val === undefined || val === "" ? 1 : val),
      zod.coerce.number().int().min(1).max(3),
    ),
  })
  // PIX never supports installments — catching this at the schema
  // boundary is defense-in-depth against the runtime throw in
  // `createAsaasPayment`. Will be superseded by the unified paymentOption
  // enum in a later PR.
  .refine(
    (data) => data.billingType !== "PIX" || data.installmentCount === 1,
    {
      message: "Pix não aceita parcelamento",
      path: ["installmentCount"],
    },
  )

export type PaymentFormData = z.infer<typeof paymentFormSchema>
