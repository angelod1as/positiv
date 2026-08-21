import { describe, expect, it } from "vitest"
import { validateQuestion } from "~/components/forms/runtime/validate-question"
import { buildLoginQuestions } from "./build-login-questions"

const find = (id: string) => {
  const question = buildLoginQuestions().find((item) => item.id === id)
  if (!question) throw new Error(`no question with id ${id}`)
  return question
}

describe("buildLoginQuestions", () => {
  it("asks for an e-mail and a password, in reading order", () => {
    expect(buildLoginQuestions().map((question) => question.id)).toEqual([
      "email",
      "password",
    ])
  })

  it("labels the fields the way the page always has", () => {
    expect(find("email").prompt).toBe("E-mail")
    expect(find("password").prompt).toBe("Senha")
  })

  it("masks the password and tells the manager this is a sign-in", () => {
    expect(find("password").input).toEqual({
      kind: "password",
      autoComplete: "current-password",
      placeholder: "senha123",
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
    expect(validateQuestion(find("password"), "")).toEqual({
      ok: false,
      message: "Campo obrigatório",
    })
  })

  it("takes any password the person already has", () => {
    // Length rules belong to signing up. A password made before the rule
    // changed still signs in.
    expect(validateQuestion(find("password"), "abc").ok).toBe(true)
  })
})
