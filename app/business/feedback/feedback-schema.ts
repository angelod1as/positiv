import { type z } from "zod"
import { adminFeedbacksCopy } from "~/copy/admin"
import { feedbackValidation } from "~/copy/public"
import { sharedCopy } from "~/copy/shared"
import { zod } from "~/lib/helpers/zod"

export const feedbackFormSchema = zod.object({
  name: zod.string().optional(),
  email: zod.string().email().optional().or(zod.literal("")),
  whatsapp: zod.string().optional(),
  hasParticipated: zod.enum(["never", "once", "more_than_once"], {
    message: feedbackValidation.hasParticipated,
  }),
  feedbackText: zod.string().min(10).max(5000),
  canContact: zod.preprocess(
    (val) => val === "on" || val === true || val === "true",
    zod.boolean(),
  ),
  captchaToken: zod
    .string()
    .min(1, sharedCopy.validation.captcha),
})

export type FeedbackFormData = z.infer<typeof feedbackFormSchema>

export const feedbackStatusValues = ["new", "in_progress", "resolved"] as const

export type FeedbackStatus = (typeof feedbackStatusValues)[number]

export const feedbackStatusLabels: Record<FeedbackStatus, string> =
  adminFeedbacksCopy.statusLabels

export const updateFeedbackStatusSchema = zod.object({
  intent: zod.literal("update-feedback-status"),
  id: zod.string(),
  status: zod.enum(feedbackStatusValues, {
    message: adminFeedbacksCopy.invalidStatus,
  }),
})
