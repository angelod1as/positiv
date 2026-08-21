import { describe, expect, it } from "vitest"
import { validateQuestion } from "~/components/forms/runtime/validate-question"
import { buildTermsQuestions } from "./build-terms-questions"

const find = (id: string) => {
  const question = buildTermsQuestions().find((item) => item.id === id)
  if (!question) throw new Error(`no question with id ${id}`)
  return question
}

describe("buildTermsQuestions", () => {
  it("asks the three boxes, in reading order", () => {
    expect(buildTermsQuestions().map((question) => question.id)).toEqual([
      "agree",
      "commonEmails",
      "mktEmails",
    ])
  })

  it("draws each of them as a single box, not a list of one option", () => {
    for (const question of buildTermsQuestions()) {
      expect(question.input).toEqual({ kind: "boolean" })
    }
  })

  it("says beside each box what ticking it means", () => {
    expect(find("agree").prompt).toBe("Li tudo e estou de acordo!")
    expect(find("commonEmails").prompt).toBe(
      "Aceito receber e-mails gerais do sistema",
    )
    expect(find("mktEmails").prompt).toBe(
      "Aceito receber e-mails sobre a Positiv",
    )
  })

  it("explains the two e-mail choices", () => {
    expect(find("commonEmails").help).toContain("candidatura")
    expect(find("mktEmails").help).toContain("parcerias")
    expect(find("agree").help).toBeUndefined()
  })

  it("refuses to continue until the terms are agreed to", () => {
    expect(validateQuestion(find("agree"), false).ok).toBe(false)
    expect(validateQuestion(find("agree"), true).ok).toBe(true)
  })

  it("refuses to continue without the e-mails the system has to send", () => {
    expect(validateQuestion(find("commonEmails"), false).ok).toBe(false)
    expect(validateQuestion(find("commonEmails"), true).ok).toBe(true)
  })

  it("takes either answer about the newsletter", () => {
    expect(validateQuestion(find("mktEmails"), false).ok).toBe(true)
    expect(validateQuestion(find("mktEmails"), true).ok).toBe(true)
  })
})
