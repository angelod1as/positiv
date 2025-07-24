import { describe, expect, it } from "vitest"
import { getRulesFormQuestions } from "./rules-questions"

describe("getRulesFormQuestions", () => {
  it("should return regular event questions for regular event type", () => {
    const questions = getRulesFormQuestions("regular")
    
    expect(questions["not-a-club"].answers.correct[1]).toBe(
      "A frase está incorreta. É até possível que haja drinks ou cerveja, mas a moderação é essencial."
    )
  })

  it("should return BDSM event questions for BDSM event type", () => {
    const questions = getRulesFormQuestions("bdsm")
    
    expect(questions["not-a-club"].answers.correct[1]).toBe(
      "A frase está incorreta. Na Positiv BDSM não há álcool ou outras substâncias."
    )
  })

  it("should return the same questions for other rules", () => {
    const regularQuestions = getRulesFormQuestions("regular")
    const bdsmQuestions = getRulesFormQuestions("bdsm")
    
    // Check that other questions remain the same
    expect(regularQuestions["leave-no-trace"]).toEqual(bdsmQuestions["leave-no-trace"])
    expect(regularQuestions["no-obligation"]).toEqual(bdsmQuestions["no-obligation"])
    expect(regularQuestions["phone"]).toEqual(bdsmQuestions["phone"])
  })
})