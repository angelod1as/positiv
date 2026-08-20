import { describe, expect, it } from "vitest"
import { validateQuestion } from "~/components/forms/runtime/validate-question"
import { buildForgotPasswordQuestions } from "./build-forgot-password-questions"

const find = (id: string) => {
  const question = buildForgotPasswordQuestions().find((item) => item.id === id)
  if (!question) throw new Error(`no question with id ${id}`)
  return question
}

describe("buildForgotPasswordQuestions", () => {
  it("asks for an e-mail and nothing else", () => {
    expect(
      buildForgotPasswordQuestions().map((question) => question.id),
    ).toEqual(["email"])
  })

  it("labels the field the way the page always has", () => {
    expect(find("email").prompt).toBe("E-mail")
    expect(find("email").input).toEqual({
      kind: "email",
      placeholder: "email@exemplo.com",
    })
  })

  it("rejects an address that is not an e-mail", () => {
    expect(validateQuestion(find("email"), "nao-e-email").ok).toBe(false)
    expect(validateQuestion(find("email"), "pessoa@exemplo.com").ok).toBe(true)
  })

  it("refuses an empty field before the server is asked", () => {
    expect(validateQuestion(find("email"), "")).toEqual({
      ok: false,
      message: "Campo obrigatório",
    })
  })
})
