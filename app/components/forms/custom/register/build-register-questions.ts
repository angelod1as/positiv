import {
  PASSWORDS_DIFFER_MESSAGE,
  registerUserFieldsSchema,
} from "~/business/common"
import type { Question } from "~/components/forms/runtime/question.types"
import { registerCopy } from "~/copy/auth"

export function buildRegisterQuestions(): Question[] {
  const { shape } = registerUserFieldsSchema

  return [
    {
      id: "email",
      prompt: registerCopy.labels.email,
      input: { kind: "email", placeholder: registerCopy.placeholders.email },
      schema: shape.email,
    },
    {
      id: "password",
      prompt: registerCopy.labels.password,
      input: { kind: "password", autoComplete: "new-password" },
      schema: shape.password,
    },
    {
      id: "confirmPassword",
      prompt: registerCopy.labels.confirmPassword,
      input: { kind: "password", autoComplete: "new-password" },
      schema: shape.confirmPassword,
      refine: (value, answers) =>
        value === answers.password
          ? null
          : { ok: false, message: PASSWORDS_DIFFER_MESSAGE },
    },
    {
      id: "over18",
      prompt: registerCopy.labels.over18,
      input: { kind: "boolean" },
      schema: shape.over18,
    },
    {
      // The widget is drawn by the page's own renderer, which reaches for this
      // question by id. The kind is only what the fallback would draw.
      id: "captchaToken",
      prompt: registerCopy.labels.captcha,
      input: { kind: "text" },
      schema: shape.captchaToken,
    },
  ]
}
