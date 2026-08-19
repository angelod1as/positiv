import { describe, expect, it } from "vitest"
import { validateQuestion } from "~/components/forms/runtime/validate-question"
import { buildRegisterQuestions } from "./build-register-questions"

const find = (id: string) => {
  const question = buildRegisterQuestions().find((item) => item.id === id)
  if (!question) throw new Error(`no question with id ${id}`)
  return question
}

describe("buildRegisterQuestions", () => {
  it("asks every field the signup needs, in reading order", () => {
    expect(buildRegisterQuestions().map((question) => question.id)).toEqual([
      "email",
      "password",
      "confirmPassword",
      "over18",
      "captchaToken",
    ])
  })

  it("masks both password fields", () => {
    expect(find("password").input).toEqual({
      kind: "password",
      autoComplete: "new-password",
    })
    expect(find("confirmPassword").input).toEqual({
      kind: "password",
      autoComplete: "new-password",
    })
  })

  it("rejects an address that is not an e-mail", () => {
    expect(validateQuestion(find("email"), "nao-e-email").ok).toBe(false)
    expect(validateQuestion(find("email"), "pessoa@exemplo.com").ok).toBe(true)
  })

  it("rejects a password under eight characters", () => {
    expect(validateQuestion(find("password"), "curta").ok).toBe(false)
    expect(validateQuestion(find("password"), "segredo123").ok).toBe(true)
  })

  it("asks for a confirmation before comparing it to anything", () => {
    // An empty field is missing, not mismatched. Saying the passwords differ
    // when one of them was never typed describes the wrong problem.
    expect(validateQuestion(find("confirmPassword"), "", {})).toEqual({
      ok: false,
      message: "Campo obrigatório",
    })
  })

  it("rejects a confirmation that does not match the password", () => {
    const confirm = find("confirmPassword")

    expect(
      validateQuestion(confirm, "outra", { password: "segredo123" }),
    ).toEqual({ ok: false, message: "As senhas não são iguais" })

    expect(
      validateQuestion(confirm, "segredo123", { password: "segredo123" }),
    ).toEqual({ ok: true })
  })

  it("refuses someone who did not say they are over 18", () => {
    expect(validateQuestion(find("over18"), false)).toEqual({
      ok: false,
      message: "Você só pode se cadastrar se for maior de 18 anos",
    })
    expect(validateQuestion(find("over18"), true)).toEqual({ ok: true })
  })

  it("asks for the age as a single box rather than a list of one", () => {
    expect(find("over18").input).toEqual({ kind: "boolean" })
  })

  it("refuses an empty captcha token", () => {
    expect(validateQuestion(find("captchaToken"), "")).toEqual({
      ok: false,
      message: "Por favor, complete a verificação de segurança",
    })
    expect(validateQuestion(find("captchaToken"), "um-token")).toEqual({
      ok: true,
    })
  })
})
