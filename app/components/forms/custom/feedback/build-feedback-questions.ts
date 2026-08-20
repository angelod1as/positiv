import { feedbackFormSchema } from "~/business/feedback/feedback-schema"
import type { Question } from "~/components/forms/runtime/question.types"
import { publicCopy } from "~/copy/public"

const feedbackCopy = publicCopy.feedback

export function buildFeedbackQuestions(): Question[] {
  const { shape } = feedbackFormSchema

  return [
    {
      id: "name",
      prompt: feedbackCopy.labels.name,
      input: { kind: "text", placeholder: feedbackCopy.placeholders.name },
      schema: shape.name,
    },
    {
      id: "email",
      prompt: feedbackCopy.labels.email,
      input: { kind: "email", placeholder: feedbackCopy.placeholders.email },
      schema: shape.email,
    },
    {
      id: "whatsapp",
      prompt: feedbackCopy.labels.whatsapp,
      input: { kind: "text", placeholder: feedbackCopy.placeholders.whatsapp },
      schema: shape.whatsapp,
    },
    {
      id: "hasParticipated",
      prompt: feedbackCopy.labels.hasParticipated,
      input: {
        kind: "select",
        options: [
          { label: feedbackCopy.participation.never, value: "never" },
          { label: feedbackCopy.participation.once, value: "once" },
          {
            label: feedbackCopy.participation.moreThanOnce,
            value: "more_than_once",
          },
        ],
      },
      schema: shape.hasParticipated,
    },
    {
      id: "feedbackText",
      prompt: feedbackCopy.labels.feedbackText,
      input: {
        kind: "textarea",
        placeholder: feedbackCopy.placeholders.feedbackText,
      },
      schema: shape.feedbackText,
    },
    {
      id: "canContact",
      prompt: feedbackCopy.labels.canContact,
      help: feedbackCopy.descriptions.canContact,
      input: { kind: "boolean" },
      schema: shape.canContact,
    },
    {
      // The widget is drawn by the page's own renderer, which reaches for this
      // question by id. The kind is only what the fallback would draw.
      id: "captchaToken",
      prompt: feedbackCopy.labels.captchaToken,
      input: { kind: "text" },
      schema: shape.captchaToken,
    },
  ]
}
