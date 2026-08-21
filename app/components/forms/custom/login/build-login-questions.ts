import { loginSchema } from "~/business/common"
import type { Question } from "~/components/forms/runtime/question.types"
import { loginCopy } from "~/copy/auth"

export function buildLoginQuestions(): Question[] {
  const { shape } = loginSchema

  return [
    {
      id: "email",
      prompt: loginCopy.labels.email,
      input: { kind: "email", placeholder: loginCopy.placeholders.email },
      schema: shape.email,
    },
    {
      id: "password",
      prompt: loginCopy.labels.password,
      input: {
        kind: "password",
        autoComplete: "current-password",
        placeholder: loginCopy.placeholders.password,
      },
      schema: shape.password,
    },
  ]
}
