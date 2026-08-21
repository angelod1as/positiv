import { agreeToTermsSchema } from "~/business/common"
import type { Question } from "~/components/forms/runtime/question.types"
import { agreeToTermsCopy } from "~/copy/dashboard"

export function buildTermsQuestions(): Question[] {
  const { shape } = agreeToTermsSchema

  return [
    {
      id: "agree",
      prompt: agreeToTermsCopy.labels.agree,
      input: { kind: "boolean" },
      schema: shape.agree,
    },
    {
      id: "commonEmails",
      prompt: agreeToTermsCopy.labels.commonEmails,
      help: agreeToTermsCopy.descriptions.commonEmails,
      input: { kind: "boolean" },
      schema: shape.commonEmails,
    },
    {
      id: "mktEmails",
      prompt: agreeToTermsCopy.labels.mktEmails,
      help: agreeToTermsCopy.descriptions.mktEmails,
      input: { kind: "boolean" },
      schema: shape.mktEmails,
    },
  ]
}
