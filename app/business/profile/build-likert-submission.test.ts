import { describe, expect, it } from "vitest"
import { buildLikertSubmission } from "./build-likert-submission"

const scale = {
  statements: [
    { key: "ciume", text: "Sinto ciúme e tudo bem." },
    { key: "consentimento", text: "Pergunto antes de tocar." },
  ],
}

describe("buildLikertSubmission", () => {
  it("turns each choice into its point on the scale, in the scale's order", () => {
    const submission = buildLikertSubmission(scale, {
      consentimento: { choice: "strongly_agree" },
      ciume: { choice: "strongly_disagree", comment: "  depende do dia " },
    })

    expect(submission).toEqual({
      beenTo: [],
      nonMonogamySince: null,
      answers: [
        {
          statementKey: "ciume",
          statementText: "Sinto ciúme e tudo bem.",
          answer: 1,
          comment: "  depende do dia ",
        },
        {
          statementKey: "consentimento",
          statementText: "Pergunto antes de tocar.",
          answer: 5,
          comment: null,
        },
      ],
    })
  })

  it.each([
    ["disagree", 2],
    ["depends", 3],
    ["agree", 4],
  ] as const)("reads %s as %i", (choice, point) => {
    const submission = buildLikertSubmission(scale, {
      ciume: { choice },
      consentimento: { choice },
    })

    expect(submission?.answers.map(({ answer }) => answer)).toEqual([
      point,
      point,
    ])
  })

  it("refuses a comment longer than 5000 characters", () => {
    expect(
      buildLikertSubmission(scale, {
        ciume: { choice: "agree", comment: "a".repeat(5001) },
        consentimento: { choice: "agree" },
      }),
    ).toBeNull()
  })

  it("takes the statement's text from the scale, never from the answers", () => {
    const submission = buildLikertSubmission(scale, {
      ciume: { choice: "agree", statementText: "texto forjado" },
      consentimento: { choice: "agree" },
    })

    expect(submission?.answers[0]?.statementText).toBe(
      "Sinto ciúme e tudo bem.",
    )
  })

  it("refuses answers missing a statement", () => {
    expect(
      buildLikertSubmission(scale, { ciume: { choice: "agree" } }),
    ).toBeNull()
  })

  it("refuses an answer to a statement the scale no longer has", () => {
    expect(
      buildLikertSubmission(scale, {
        ciume: { choice: "agree" },
        consentimento: { choice: "agree" },
        antiga: { choice: "agree" },
      }),
    ).toBeNull()
  })

  it("refuses a choice off the scale", () => {
    expect(
      buildLikertSubmission(scale, {
        ciume: { choice: "maybe" },
        consentimento: { choice: "agree" },
      }),
    ).toBeNull()
  })
})
