import { describe, expect, it } from "vitest"
import { validateQuestion } from "~/components/forms/runtime/validate-question"
import { buildFeedbackQuestions } from "./build-feedback-questions"

const find = (id: string) => {
  const question = buildFeedbackQuestions().find((item) => item.id === id)
  if (!question) throw new Error(`no question with id ${id}`)
  return question
}

describe("buildFeedbackQuestions", () => {
  it("asks every field the form has, in reading order", () => {
    expect(buildFeedbackQuestions().map((question) => question.id)).toEqual([
      "name",
      "email",
      "whatsapp",
      "hasParticipated",
      "feedbackText",
      "canContact",
      "captchaToken",
    ])
  })

  it("offers the three answers about having been to an event", () => {
    expect(find("hasParticipated").input).toEqual({
      kind: "select",
      options: [
        { label: "Nunca participei", value: "never" },
        { label: "Participei uma vez", value: "once" },
        { label: "Participei mais de uma vez", value: "more_than_once" },
      ],
    })
  })

  it("gives the feedback itself room to be written in", () => {
    expect(find("feedbackText").input).toEqual({
      kind: "textarea",
      placeholder: "Escreva aqui seu feedback, sugestão ou crítica...",
    })
  })

  it("asks about contact as a single box, with what it means beside it", () => {
    expect(find("canContact").input).toEqual({ kind: "boolean" })
    expect(find("canContact").help).toContain("WhatsApp")
  })

  it("lets someone say nothing in the optional fields", () => {
    expect(validateQuestion(find("name"), undefined).ok).toBe(true)
    expect(validateQuestion(find("email"), undefined).ok).toBe(true)
    expect(validateQuestion(find("whatsapp"), undefined).ok).toBe(true)
  })

  it("still refuses an e-mail that is not one", () => {
    expect(validateQuestion(find("email"), "nao-e-email").ok).toBe(false)
    expect(validateQuestion(find("email"), "pessoa@exemplo.com").ok).toBe(true)
  })

  it("asks for a feedback long enough to act on", () => {
    expect(validateQuestion(find("feedbackText"), "curto").ok).toBe(false)
    expect(
      validateQuestion(find("feedbackText"), "Um feedback de tamanho decente")
        .ok,
    ).toBe(true)
  })

  it("insists on an answer about having been to an event", () => {
    expect(validateQuestion(find("hasParticipated"), undefined).ok).toBe(false)
    expect(validateQuestion(find("hasParticipated"), "once").ok).toBe(true)
  })

  it("refuses to send anything until the captcha has answered", () => {
    expect(validateQuestion(find("captchaToken"), "").ok).toBe(false)
    expect(validateQuestion(find("captchaToken"), "token").ok).toBe(true)
  })
})
