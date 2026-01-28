import { type z } from "zod"
import { zod } from "~/lib/helpers/zod"

export const feedbackFormSchema = zod.object({
  name: zod.string().optional(),
  email: zod
    .string()
    .email("Insira um e-mail válido")
    .optional()
    .or(zod.literal("")),
  whatsapp: zod.string().optional(),
  hasParticipated: zod.enum(["never", "once", "more_than_once"], {
    message: "Selecione uma opção",
  }),
  feedbackText: zod
    .string()
    .min(10, "O feedback deve ter pelo menos 10 caracteres")
    .max(5000, "O feedback deve ter no máximo 5000 caracteres"),
  canContact: zod.preprocess(
    (val) => val === "on" || val === true || val === "true",
    zod.boolean(),
  ),
  captchaToken: zod
    .string()
    .min(1, "Por favor, complete a verificação de segurança"),
})

export type FeedbackFormData = z.infer<typeof feedbackFormSchema>
