import { emailPreferencesSchema } from "~/business/newsletter/email-preferences-schema"
import type { Question } from "~/components/forms/runtime/question.types"
import { emailConsentCopy } from "~/copy/emails"

export function buildEmailConsentQuestions(): Question[] {
  const { shape } = emailPreferencesSchema
  const { labels, descriptions } = emailConsentCopy

  return (["registrationAlerts", "newsletter", "marketing"] as const).map(
    (id) => ({
      id,
      prompt: labels[id],
      help: descriptions[id],
      input: { kind: "boolean" },
      schema: shape[id],
    }),
  )
}
