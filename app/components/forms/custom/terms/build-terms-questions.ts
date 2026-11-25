import { agreeToTermsSchema } from "~/business/profile/profile-schemas"
import { buildEmailConsentQuestions } from "~/components/forms/custom/email-consent/build-email-consent-questions"
import type { Question } from "~/components/forms/runtime/question.types"
import { agreeToTermsCopy } from "~/copy/dashboard"

export function buildTermsQuestions(): Question[] {
  return [
    {
      id: "agree",
      prompt: agreeToTermsCopy.labels.agree,
      input: { kind: "boolean" },
      schema: agreeToTermsSchema.shape.agree,
    },
    ...buildEmailConsentQuestions(),
  ]
}
