import {
  PASSWORDS_DIFFER_MESSAGE,
  registerUserFieldsSchema,
} from "~/business/common"
import type { Question } from "~/components/forms/runtime/question.types"

export function buildRegisterQuestions(): Question[] {
  const { shape } = registerUserFieldsSchema

  return [
    {
      id: "email",
      prompt: "E-mail",
      input: { kind: "email", placeholder: "email@exemplo.com" },
      schema: shape.email,
    },
    {
      id: "password",
      prompt: "Senha",
      input: { kind: "password", autoComplete: "new-password" },
      schema: shape.password,
    },
    {
      id: "confirmPassword",
      prompt: "Confirme a senha",
      input: { kind: "password", autoComplete: "new-password" },
      schema: shape.confirmPassword,
      refine: (value, answers) =>
        value === answers.password
          ? null
          : { ok: false, message: PASSWORDS_DIFFER_MESSAGE },
    },
    {
      id: "over18",
      prompt: "Sou maior de 18 anos",
      input: { kind: "boolean" },
      schema: shape.over18,
    },
    {
      // The widget is drawn by the page's own renderer, which reaches for this
      // question by id. The kind is only what the fallback would draw.
      id: "captchaToken",
      prompt: "Verificação de segurança",
      input: { kind: "text" },
      schema: shape.captchaToken,
    },
  ]
}
