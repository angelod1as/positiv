import { describe, expect, it } from "vitest"
import { validateQuestion } from "~/components/forms/runtime/validate-question"
import { buildTermsQuestions } from "./build-terms-questions"

const find = (id: string) => {
  const question = buildTermsQuestions().find((item) => item.id === id)
  if (!question) throw new Error(`no question with id ${id}`)
  return question
}

describe("buildTermsQuestions", () => {
  it("asks for the terms, then the three email categories, in reading order", () => {
    expect(buildTermsQuestions().map((question) => question.id)).toEqual([
      "agree",
      "registrationAlerts",
      "newsletter",
      "marketing",
    ])
  })

  it("draws each of them as a single box, not a list of one option", () => {
    for (const question of buildTermsQuestions()) {
      expect(question.input).toEqual({ kind: "boolean" })
    }
  })

  it("says beside each box what ticking it means", () => {
    expect(find("agree").prompt).toBe("Li tudo e estou de acordo!")
    expect(find("registrationAlerts").prompt).toBe(
      "Quero ser avisade quando abrirem as inscrições das festas.",
    )
    expect(find("newsletter").prompt).toBe(
      "Quero receber a newsletter da Positiv.",
    )
    expect(find("marketing").prompt).toBe(
      "Aceito receber divulgações e parcerias.",
    )
  })

  it("refuses to continue until the terms are agreed to", () => {
    expect(validateQuestion(find("agree"), false).ok).toBe(false)
    expect(validateQuestion(find("agree"), true).ok).toBe(true)
  })

  it("takes either answer for every email category", () => {
    for (const id of ["registrationAlerts", "newsletter", "marketing"]) {
      expect(validateQuestion(find(id), false).ok).toBe(true)
      expect(validateQuestion(find(id), true).ok).toBe(true)
    }
  })
})
