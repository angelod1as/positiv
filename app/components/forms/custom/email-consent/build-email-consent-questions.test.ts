import { describe, expect, it } from "vitest"
import { validateQuestion } from "~/components/forms/runtime/validate-question"
import { buildEmailConsentQuestions } from "./build-email-consent-questions"

const find = (id: string) => {
  const question = buildEmailConsentQuestions().find((item) => item.id === id)
  if (!question) throw new Error(`no question with id ${id}`)
  return question
}

describe("buildEmailConsentQuestions", () => {
  it("asks the three categories, in reading order", () => {
    expect(buildEmailConsentQuestions().map((question) => question.id)).toEqual([
      "registrationAlerts",
      "newsletter",
      "marketing",
    ])
  })

  it("draws each as a single box", () => {
    for (const question of buildEmailConsentQuestions()) {
      expect(question.input).toEqual({ kind: "boolean" })
    }
  })

  it("says beside each box what ticking it means, and explains it", () => {
    expect(find("registrationAlerts").prompt).toBe(
      "Quero ser avisade quando abrirem as inscrições das festas.",
    )
    expect(find("registrationAlerts").help).toBe(
      "Avisamos quando as inscrições abrem e uns dias antes. Se desmarcar, você não vai mais ser lembrade das festas e pode perder as inscrições.",
    )
    expect(find("newsletter").prompt).toBe("Quero receber a newsletter da Positiv.")
    expect(find("newsletter").help).toBe(
      "Textos nossos, informais, sobre a Positiv e a comunidade. Algumas edições são só para veteranes.",
    )
    expect(find("marketing").prompt).toBe("Aceito receber divulgações e parcerias.")
    expect(find("marketing").help).toBe(
      "Novidades de parceiros e ações de divulgação.",
    )
  })

  it("accepts both answers to every box", () => {
    for (const question of buildEmailConsentQuestions()) {
      expect(validateQuestion(question, true, {})).toEqual({ ok: true })
      expect(validateQuestion(question, false, {})).toEqual({ ok: true })
    }
  })
})
