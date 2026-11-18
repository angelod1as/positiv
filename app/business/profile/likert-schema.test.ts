import { describe, expect, it } from "vitest"
import { likertSubmissionSchema } from "./likert-schema"

describe("likertSubmissionSchema", () => {
  const valid = {
    beenTo: ["Positiv"],
    nonMonogamySince: "2019-03",
    answers: [
      {
        statementKey: "consent",
        statementText: "Consentimento se pergunta.",
        answer: 5,
        comment: "Sempre.",
      },
      {
        statementKey: "jealousy",
        statementText: "Ciúme é natural.",
        answer: 3,
      },
    ],
  }

  it("should accept a complete submission", () => {
    expect(likertSubmissionSchema.safeParse(valid).success).toBe(true)
  })

  it("should accept someone who does not live non-monogamy today", () => {
    const result = likertSubmissionSchema.safeParse({
      ...valid,
      nonMonogamySince: null,
    })

    expect(result.success).toBe(true)
  })

  it("should accept someone who has been to none of the places", () => {
    expect(
      likertSubmissionSchema.safeParse({ ...valid, beenTo: [] }).success,
    ).toBe(true)
  })

  it.each([0, 6, 2.5])("should refuse %s as an answer", (answer) => {
    const result = likertSubmissionSchema.safeParse({
      ...valid,
      answers: [{ ...valid.answers[0], answer }],
    })

    expect(result.success).toBe(false)
  })

  it("should refuse a submission with no statement answered", () => {
    expect(
      likertSubmissionSchema.safeParse({ ...valid, answers: [] }).success,
    ).toBe(false)
  })

  it("should refuse the same statement answered twice", () => {
    const result = likertSubmissionSchema.safeParse({
      ...valid,
      answers: [valid.answers[0], { ...valid.answers[0], answer: 1 }],
    })

    expect(result.success).toBe(false)
  })

  it("should refuse a statement without the text the person saw", () => {
    const result = likertSubmissionSchema.safeParse({
      ...valid,
      answers: [{ ...valid.answers[0], statementText: "" }],
    })

    expect(result.success).toBe(false)
  })

  it.each(["2019", "2019-13", "03/2019", "2019-3"])(
    "should refuse %s as the month non-monogamy started",
    (nonMonogamySince) => {
      const result = likertSubmissionSchema.safeParse({
        ...valid,
        nonMonogamySince,
      })

      expect(result.success).toBe(false)
    },
  )

  it.each([
    ["a comment", { comment: "x".repeat(5001) }],
    ["a statement text", { statementText: "x".repeat(2001) }],
    ["a statement key", { statementKey: "x".repeat(201) }],
  ])("should refuse %s that is too long", (_, override) => {
    const result = likertSubmissionSchema.safeParse({
      ...valid,
      answers: [{ ...valid.answers[0], ...override }],
    })

    expect(result.success).toBe(false)
  })

  it("should refuse a place name that is too long", () => {
    const result = likertSubmissionSchema.safeParse({
      ...valid,
      beenTo: ["x".repeat(201)],
    })

    expect(result.success).toBe(false)
  })

  it("should refuse more places or statements than any form shows", () => {
    const tooManyPlaces = Array.from({ length: 51 }, (_, i) => `Lugar ${i}`)
    const tooManyAnswers = Array.from({ length: 201 }, (_, i) => ({
      ...valid.answers[0],
      statementKey: `s${i}`,
    }))

    expect(
      likertSubmissionSchema.safeParse({ ...valid, beenTo: tooManyPlaces })
        .success,
    ).toBe(false)
    expect(
      likertSubmissionSchema.safeParse({ ...valid, answers: tooManyAnswers })
        .success,
    ).toBe(false)
  })

  it("should turn a blank comment into no comment", () => {
    const result = likertSubmissionSchema.parse({
      ...valid,
      answers: [{ ...valid.answers[0], comment: "   " }],
    })

    expect(result.answers[0].comment).toBeNull()
  })
})
