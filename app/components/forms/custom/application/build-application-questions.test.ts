import { describe, expect, it } from "vitest"
import { eventApplicationCopy } from "~/copy/events"
import { buildApplicationQuestions } from "./build-application-questions"

const questionsById = () =>
  Object.fromEntries(
    buildApplicationQuestions().map((question) => [question.id, question]),
  )

describe("the event application questions", () => {
  it("asks what the form asks today, in the order it asks", () => {
    expect(buildApplicationQuestions().map((question) => question.id)).toEqual([
      "referrals",
      "referred",
      "companions",
      "bond",
      "notes",
    ])
  })

  it("carries the copy the form is written with", () => {
    const { referred } = questionsById()

    expect(referred.prompt).toBe(eventApplicationCopy.labels.referred)
    expect(referred.help).toBe(eventApplicationCopy.descriptions.referred)
  })

  it("writes the long answers in a box that grows", () => {
    const questions = questionsById()

    for (const id of ["referrals", "referred", "companions", "notes"]) {
      expect(questions[id].input.kind).toBe("textarea")
    }
  })

  it("offers the two answers the bond question has", () => {
    const { bond } = questionsById()

    expect(bond.input).toEqual({
      kind: "radio",
      options: [
        { label: "Só vou acompanhade.", value: "Só vou acompanhade." },
        { label: "Posso ir sozinhe.", value: "Posso ir sozinhe." },
      ],
    })
  })

  it("insists on being told who referred the person", () => {
    const { referred } = questionsById()

    expect(referred.schema.safeParse("").success).toBe(false)
    expect(referred.schema.safeParse("ninguém").success).toBe(true)
  })

  it("takes silence for an answer everywhere else", () => {
    const questions = questionsById()

    for (const id of ["referrals", "companions", "notes"]) {
      expect(questions[id].schema.safeParse(undefined).success).toBe(true)
    }
  })

  it("turns down a bond answer nobody offered", () => {
    const { bond } = questionsById()

    expect(bond.schema.safeParse("Talvez.").success).toBe(false)
    expect(bond.schema.safeParse("Posso ir sozinhe.").success).toBe(true)
  })
})
