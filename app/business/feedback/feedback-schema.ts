import { type z } from "zod"
import { zod } from "~/lib/helpers/zod"

export const feedbackFormSchema = zod.object({
  name: zod.string().optional(),
  email: zod.string().email().optional().or(zod.literal("")),
  whatsapp: zod.string().optional(),
  hasParticipated: zod.enum(["never", "once", "more_than_once"], {
    message: "Selecione uma opção",
  }),
  feedbackText: zod.string().min(10).max(5000),
  canContact: zod.preprocess(
    (val) => val === "on" || val === true || val === "true",
    zod.boolean(),
  ),
  captchaToken: zod
    .string()
    .min(1, "Por favor, complete a verificação de segurança"),
})

export type FeedbackFormData = z.infer<typeof feedbackFormSchema>

export const feedbackStatusValues = ["new", "in_progress", "resolved"] as const

export type FeedbackStatus = (typeof feedbackStatusValues)[number]

export const feedbackStatusLabels: Record<FeedbackStatus, string> = {
  new: "Novo",
  in_progress: "Em progresso",
  resolved: "Resolvido",
}

export const updateFeedbackStatusSchema = zod.object({
  intent: zod.literal("update-feedback-status"),
  id: zod.string(),
  status: zod.enum(feedbackStatusValues, { message: "Status inválido" }),
})
