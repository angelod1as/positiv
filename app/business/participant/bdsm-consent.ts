import { zod } from "~/lib/helpers/zod"

export const bdsmConsentSchema = zod.object({
  consent: zod
    .boolean()
    .refine((val) => val === true, {
      message: "Você deve aceitar para continuar",
    }),
})