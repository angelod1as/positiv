import { describe, expect, it } from "vitest"
import { validateQuestion } from "~/components/forms/runtime/validate-question"
import { buildChangePasswordQuestions } from "./build-change-password-questions"

const find = (id: string) => {
  const question = buildChangePasswordQuestions().find((item) => item.id === id)
  if (!question) throw new Error(`no question with id ${id}`)
  return question
}

describe("buildChangePasswordQuestions", () => {
  it("asks for the new password and its confirmation, in reading order", () => {
    expect(
      buildChangePasswordQuestions().map((question) => question.id),
    ).toEqual(["password", "confirm_password"])
  })

  it("labels the fields the way the page always has", () => {
    expect(find("password").prompt).toBe("Nova senha")
    expect(find("confirm_password").prompt).toBe("Confirmar senha")
  })

  it("masks both fields and tells the manager this is a new password", () => {
    expect(find("password").input).toEqual({
      kind: "password",
      autoComplete: "new-password",
      placeholder: "senha123",
    })
    expect(find("confirm_password").input).toEqual({
      kind: "password",
      autoComplete: "new-password",
      placeholder: "senha123",
    })
  })

  it("rejects a password under six characters", () => {
    expect(validateQuestion(find("password"), "curta").ok).toBe(false)
    expect(validateQuestion(find("password"), "segredo123").ok).toBe(true)
  })

  it("rejects a confirmation that does not match", () => {
    const confirm = find("confirm_password")

    expect(
      validateQuestion(confirm, "outra", { password: "segredo123" }),
    ).toEqual({ ok: false, message: "As senhas não combinam" })

    expect(
      validateQuestion(confirm, "segredo123", { password: "segredo123" }),
    ).toEqual({ ok: true })
  })

  it("asks for a confirmation before comparing it to anything", () => {
    expect(validateQuestion(find("confirm_password"), undefined, {})).toEqual({
      ok: false,
      message: "Campo obrigatório",
    })
  })
})
