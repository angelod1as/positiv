import { changePasswordFieldsSchema } from "~/business/common"
import type { Question } from "~/components/forms/runtime/question.types"
import { changePasswordCopy } from "~/copy/account"

export function buildChangePasswordQuestions(): Question[] {
  const { shape } = changePasswordFieldsSchema

  return [
    {
      id: "password",
      prompt: changePasswordCopy.labels.password,
      input: {
        kind: "password",
        autoComplete: "new-password",
        placeholder: changePasswordCopy.placeholders.password,
      },
      schema: shape.password,
    },
    {
      id: "confirm_password",
      prompt: changePasswordCopy.labels.confirm_password,
      input: {
        kind: "password",
        autoComplete: "new-password",
        placeholder: changePasswordCopy.placeholders.confirm_password,
      },
      schema: shape.confirm_password,
      refine: (value, answers) =>
        value === answers.password
          ? null
          : {
              ok: false,
              message: changePasswordCopy.validation.passwordMismatch,
            },
    },
  ]
}
