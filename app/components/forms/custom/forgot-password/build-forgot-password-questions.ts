import { forgotPasswordSchema } from "~/business/common"
import type { Question } from "~/components/forms/runtime/question.types"
import { forgotPasswordCopy } from "~/copy/auth"

export function buildForgotPasswordQuestions(): Question[] {
  const { shape } = forgotPasswordSchema

  return [
    {
      id: "email",
      prompt: forgotPasswordCopy.labels.email,
      input: {
        kind: "email",
        placeholder: forgotPasswordCopy.placeholders.email,
      },
      schema: shape.email,
    },
  ]
}
